import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { argon2id, argon2Verify } from 'hash-wasm';
import { getDb } from './db';
import {
  generateBase32Secret,
  verifyTOTPCode,
  generateTotpUri,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from './totp';
import type { AstroCookies } from 'astro';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  created_at: number;
  last_login_at: number | null;
  mfa_enabled?: boolean;
}

const SESSION_COOKIE_NAME = 'mb_cms_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days absolute limit
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours idle timeout
const MAX_FAILED_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  // In development, provide a deterministic fallback if not yet set
  if (process.env.NODE_ENV !== 'production') {
    return 'portfolio-cms-dev-session-secret-fallback-key';
  }
  // Fallback for production if SESSION_SECRET was omitted to prevent crashes
  return 'portfolio-cms-prod-fallback-secret-please-set-env-var';
}

export function hashSessionToken(token: string): string {
  const secret = getSessionSecret();
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  return argon2id({
    password: plain,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$argon2id$') || hash.startsWith('$argon2i$') || hash.startsWith('$argon2d$')) {
    return argon2Verify({
      password: plain,
      hash,
    });
  }
  return bcrypt.compare(plain, hash);
}

export async function getAdminUserCount(): Promise<number> {
  const db = getDb();
  const row = (await db.prepare('SELECT COUNT(*) as count FROM admin_users').get()) as { count: any } | null;
  return row ? Number(row.count) : 0;
}

export async function isRateLimited(ip: string): Promise<boolean> {
  const db = getDb();
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
  const countRow = (await db.prepare(`
    SELECT COUNT(*) as count FROM login_attempts
    WHERE ip_address = ? AND attempted_at > ? AND success = 0
  `).get(ip, cutoff)) as { count: any } | null;

  return (Number(countRow?.count) || 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO login_attempts (id, ip_address, attempted_at, success)
    VALUES (?, ?, ?, ?)
  `);
  await insert.run(crypto.randomUUID(), ip, Date.now(), success ? 1 : 0);
}

export async function createAdminUser(
  username: string,
  email: string,
  plainPassword: string,
  name: string
): Promise<AdminUser> {
  const db = getDb();
  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  await db.exec('BEGIN;');
  try {
    const countRow = (await db.prepare('SELECT COUNT(*) as count FROM admin_users').get()) as { count: any } | null;
    if (countRow && Number(countRow.count) > 0) {
      throw new Error('Initial setup is locked. An administrator account already exists.');
    }

    const existingEmail = await db.prepare('SELECT id FROM admin_users WHERE email = ?').get(cleanEmail);
    if (existingEmail) {
      throw new Error('An administrator account with this email address already exists.');
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(plainPassword);
    const now = Date.now();

    const insert = db.prepare(`
      INSERT INTO admin_users (id, username, email, password_hash, name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)
    `);

    await insert.run(id, cleanUsername, cleanEmail, passwordHash, cleanName, now, now);
    await db.exec('COMMIT;');

    return {
      id,
      username: cleanUsername,
      email: cleanEmail,
      name: cleanName,
      role: 'admin',
      created_at: now,
      last_login_at: null,
    };
  } catch (err) {
    try {
      await db.exec('ROLLBACK;');
    } catch {}
    throw err;
  }
}

export async function authenticateAdmin(
  identifier: string,
  plainPassword: string,
  ip: string
): Promise<{ user?: AdminUser; requiresMfa?: boolean; mfaToken?: string; error?: string }> {
  const db = getDb();

  if (await isRateLimited(ip)) {
    return { error: 'Too many failed login attempts. Account temporarily locked for 15 minutes.' };
  }

  const cleanIdent = identifier.trim().toLowerCase();
  const row = (await db.prepare(`
    SELECT * FROM admin_users
    WHERE username = ? OR email = ?
  `).get(cleanIdent, cleanIdent)) as any;

  if (!row) {
    await recordLoginAttempt(ip, false);
    return { error: 'Invalid username/email or password.' };
  }

  const isValid = await verifyPassword(plainPassword, row.password_hash);
  if (!isValid) {
    await recordLoginAttempt(ip, false);
    return { error: 'Invalid username/email or password.' };
  }

  // Check if TOTP Multi-Factor Authentication is enabled
  if (Number(row.mfa_enabled) === 1 && row.mfa_secret) {
    const now = Date.now();
    const mfaToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes challenge validity

    await db.prepare(`
      INSERT INTO mfa_challenges (token, user_id, expires_at, ip_address)
      VALUES (?, ?, ?, ?)
    `).run(mfaToken, row.id, expiresAt, ip);

    return {
      requiresMfa: true,
      mfaToken,
    };
  }

  // Record success and update last login
  await recordLoginAttempt(ip, true);
  const now = Date.now();
  await db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now, row.id);

  return {
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      name: row.name,
      role: row.role,
      created_at: Number(row.created_at),
      last_login_at: now,
      mfa_enabled: Boolean(row.mfa_enabled),
    },
  };
}

export async function verifyMfaLogin(
  mfaToken: string,
  codeOrRecovery: string,
  cookies: AstroCookies,
  ip: string,
  userAgent?: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const db = getDb();

  if (await isRateLimited(ip)) {
    return { success: false, error: 'Too many failed attempts. Account temporarily locked for 15 minutes.' };
  }

  const now = Date.now();
  const challenge = (await db.prepare(`
    SELECT * FROM mfa_challenges WHERE token = ? AND expires_at > ?
  `).get(mfaToken, now)) as any;

  if (!challenge) {
    await recordLoginAttempt(ip, false);
    return { success: false, error: 'MFA challenge expired or invalid. Please sign in again.' };
  }

  const user = (await db.prepare('SELECT * FROM admin_users WHERE id = ?').get(challenge.user_id)) as any;
  if (!user || !user.mfa_secret) {
    await recordLoginAttempt(ip, false);
    return { success: false, error: 'User configuration error.' };
  }

  const cleanInput = codeOrRecovery.trim();
  let verified = false;

  // 1. Try TOTP Code (6 digits)
  if (/^\d{6}$/.test(cleanInput)) {
    verified = verifyTOTPCode(user.mfa_secret, cleanInput);
  }

  // 2. Try Single-Use Recovery Code if not matched as TOTP
  if (!verified && cleanInput.length >= 8) {
    try {
      const hashedCodes = JSON.parse(user.mfa_recovery_codes || '[]');
      const recoveryResult = verifyAndConsumeRecoveryCode(cleanInput, hashedCodes);
      if (recoveryResult.valid) {
        verified = true;
        // Update remaining recovery codes in DB
        await db.prepare('UPDATE admin_users SET mfa_recovery_codes = ? WHERE id = ?').run(
          JSON.stringify(recoveryResult.remainingHashedCodes),
          user.id
        );
      }
    } catch (e) {
      console.error('Error verifying recovery code:', e);
    }
  }

  if (!verified) {
    await recordLoginAttempt(ip, false);
    return { success: false, error: 'Invalid verification code or recovery code.' };
  }

  // Consume the challenge token so it cannot be replayed
  await db.prepare('DELETE FROM mfa_challenges WHERE token = ?').run(mfaToken);

  // Success
  await recordLoginAttempt(ip, true);
  await db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(now, user.id);
  await createSession(user.id, cookies, userAgent, ip);

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: Number(user.created_at),
      last_login_at: now,
      mfa_enabled: true,
    },
  };
}

export async function startMfaEnrollment(userId: string): Promise<{ secret: string; uri: string; recoveryCodes: string[] }> {
  const db = getDb();
  const user = (await db.prepare('SELECT email, username FROM admin_users WHERE id = ?').get(userId)) as any;
  if (!user) throw new Error('User not found.');

  const secret = generateBase32Secret(20);
  const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
  const uri = generateTotpUri(secret, user.email || user.username);

  await db.prepare(`
    UPDATE admin_users SET
      mfa_pending_secret = ?,
      mfa_recovery_codes = ?
    WHERE id = ?
  `).run(secret, JSON.stringify(hashedCodes), userId);

  return {
    secret,
    uri,
    recoveryCodes: plainCodes,
  };
}

export async function confirmMfaEnrollment(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = (await db.prepare('SELECT mfa_pending_secret FROM admin_users WHERE id = ?').get(userId)) as any;
  if (!user || !user.mfa_pending_secret) {
    return { success: false, error: 'No pending MFA enrollment found. Please initiate enrollment first.' };
  }

  const isValid = verifyTOTPCode(user.mfa_pending_secret, token);
  if (!isValid) {
    return { success: false, error: 'Invalid authenticator code. Check your device time and try again.' };
  }

  // Activate MFA and clear pending secret
  await db.prepare(`
    UPDATE admin_users SET
      mfa_enabled = 1,
      mfa_secret = mfa_pending_secret,
      mfa_pending_secret = NULL
    WHERE id = ?
  `).run(userId);

  return { success: true };
}

export async function disableMfa(userId: string, passwordConfirm: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = (await db.prepare('SELECT password_hash FROM admin_users WHERE id = ?').get(userId)) as any;
  if (!user) return { success: false, error: 'User not found' };

  const valid = await verifyPassword(passwordConfirm, user.password_hash);
  if (!valid) {
    return { success: false, error: 'Incorrect password.' };
  }

  await db.prepare(`
    UPDATE admin_users SET
      mfa_enabled = 0,
      mfa_secret = NULL,
      mfa_recovery_codes = NULL,
      mfa_pending_secret = NULL
    WHERE id = ?
  `).run(userId);

  return { success: true };
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  const db = getDb();
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export async function updateAdminPassword(
  userId: string,
  currentPlain: string,
  newPlain: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = (await db.prepare('SELECT password_hash FROM admin_users WHERE id = ?').get(userId)) as any;
  if (!user) return { success: false, error: 'User not found' };

  const valid = await verifyPassword(currentPlain, user.password_hash);
  if (!valid) {
    return { success: false, error: 'Current password is incorrect.' };
  }

  if (newPlain.length < 12) {
    return { success: false, error: 'New password must be at least 12 characters long.' };
  }

  const newHash = await hashPassword(newPlain);
  const now = Date.now();

  await db.prepare(`
    UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?
  `).run(newHash, now, userId);

  // Invalidate all existing sessions upon password change
  await invalidateUserSessions(userId);

  return { success: true };
}

export async function createSession(userId: string, cookies: AstroCookies, userAgent?: string, ip?: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(token);
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  const insert = db.prepare(`
    INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at, last_active_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await insert.run(sessionId, tokenHash, userId, now, expiresAt, now, userAgent || null, ip || null);

  cookies.set(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });

  return token;
}

export async function destroySession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const db = getDb();
    const tokenHash = hashSessionToken(token);
    const legacyTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.prepare('DELETE FROM sessions WHERE token_hash = ? OR token_hash = ?').run(tokenHash, legacyTokenHash);
  }

  cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
  });
}

export async function getSessionUser(cookies: AstroCookies): Promise<AdminUser | null> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const db = getDb();
  const tokenHash = hashSessionToken(token);
  const legacyTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = Date.now();

  const row = (await db.prepare(`
    SELECT s.id as session_id, s.expires_at, s.last_active_at, u.id, u.username, u.email, u.name, u.role, u.created_at, u.last_login_at, u.mfa_enabled
    FROM sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE (s.token_hash = ? OR s.token_hash = ?) AND s.expires_at > ?
  `).get(tokenHash, legacyTokenHash, now)) as any;

  if (!row) {
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    return null;
  }

  // Check 2-hour idle timeout
  if (row.last_active_at && now - Number(row.last_active_at) > IDLE_TIMEOUT_MS) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
    cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
    return null;
  }

  // Refresh activity timestamp
  await db.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?').run(now, row.session_id);

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    role: row.role,
    created_at: Number(row.created_at),
    last_login_at: row.last_login_at ? Number(row.last_login_at) : null,
    mfa_enabled: Boolean(row.mfa_enabled),
  };
}
