import crypto from 'node:crypto';

// Base32 character set (RFC 4648)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export function decodeBase32(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTOTPCode(secretBase32: string, timeStepSeconds = 30, offsetSteps = 0): string {
  const key = decodeBase32(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / timeStepSeconds) + offsetSteps;

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = (binary % 1_000_000).toString().padStart(6, '0');
  return code;
}

export function verifyTOTPCode(secretBase32: string, token: string, window = 1): boolean {
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  for (let offset = -window; offset <= window; offset++) {
    const expected = generateTOTPCode(secretBase32, 30, offset);
    if (crypto.timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(cleanToken, 'utf-8'))) {
      return true;
    }
  }
  return false;
}

export function generateTotpUri(secretBase32: string, accountName: string, issuer = 'Portfolio CMS'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 8): { plainCodes: string[]; hashedCodes: string[] } {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    plainCodes.push(formatted);
    hashedCodes.push(crypto.createHash('sha256').update(formatted).digest('hex'));
  }

  return { plainCodes, hashedCodes };
}

export function verifyAndConsumeRecoveryCode(
  inputCode: string,
  hashedCodes: string[]
): { valid: boolean; remainingHashedCodes: string[] } {
  const clean = inputCode.trim().toUpperCase();
  const inputHash = crypto.createHash('sha256').update(clean).digest('hex');

  const matchIdx = hashedCodes.findIndex((h) => h === inputHash);
  if (matchIdx === -1) {
    return { valid: false, remainingHashedCodes: hashedCodes };
  }

  const remaining = [...hashedCodes];
  remaining.splice(matchIdx, 1);
  return { valid: true, remainingHashedCodes: remaining };
}
