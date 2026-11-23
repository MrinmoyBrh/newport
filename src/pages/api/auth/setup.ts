import type { APIRoute } from 'astro';
import { getAdminUserCount, createAdminUser, createSession, isRateLimited, recordLoginAttempt } from '../../../lib/auth';
import { logActivity } from '../../../lib/content';

export const prerender = false;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = clientAddress || request.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    // 1. Rate limiting check
    if (await isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too many registration attempts. Please wait 15 minutes.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Strict single-admin gating check
    const adminCount = await getAdminUserCount();
    if (adminCount > 0) {
      await recordLoginAttempt(ip, false);
      return new Response(JSON.stringify({ error: 'Setup is locked. An administrator account already exists. Please sign in.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, password, confirmPassword } = body;
    const username = (body.username || (email ? email.split('@')[0] : 'admin')).trim().toLowerCase();

    // 3. Required Fields validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Full name is required (minimum 2 characters).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return new Response(JSON.stringify({ error: 'A valid email address is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!password || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: 'Password is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Password Strength Rules (minimum 12 chars, uppercase, lowercase, number/symbol)
    if (password.length < 12) {
      return new Response(JSON.stringify({ error: 'Password must be at least 12 characters long.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigitOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

    if (!hasUpper || !hasLower || !hasDigitOrSymbol) {
      return new Response(JSON.stringify({
        error: 'Password must include uppercase letters, lowercase letters, and at least one number or symbol.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Confirm Password validation
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Passwords do not match.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Create administrator using Argon2id with atomic transaction
    const user = await createAdminUser(username, email.trim(), password, name.trim());
    const userAgent = request.headers.get('user-agent') || undefined;

    // 7. Establish secure authenticated session
    await createSession(user.id, cookies, userAgent, ip);
    await recordLoginAttempt(ip, true);
    await logActivity(user.id, 'SETUP', 'admin_user', user.id, `Created primary administrator "${user.username}" (${user.email})`);

    return new Response(JSON.stringify({
      success: true,
      redirect: '/admin',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    await recordLoginAttempt(ip, false);
    return new Response(JSON.stringify({ error: err.message || 'Setup initialization failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
