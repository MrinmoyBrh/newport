import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';
import {
  generateBase32Secret,
  generateTOTPCode,
  verifyTOTPCode,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from '../src/lib/totp.ts';

// Dynamically discover hashed chunks in dist/server/chunks
const chunksDir = path.resolve(process.cwd(), 'dist/server/chunks');
const chunkFiles = fs.readdirSync(chunksDir);

const authChunkFile = chunkFiles.find((f) => f.startsWith('auth_') && f.endsWith('.mjs'));
const mediaChunkFile = chunkFiles.find((f) => f.startsWith('media_') && f.endsWith('.mjs'));

if (!authChunkFile || !mediaChunkFile) {
  throw new Error('Required build chunks not found in dist/server/chunks. Run npm run build first.');
}

const authModule = await import(pathToFileURL(path.join(chunksDir, authChunkFile)).href);
const mediaModule = await import(pathToFileURL(path.join(chunksDir, mediaChunkFile)).href);

const authenticateAdmin = authModule.b;
const getAdminUserCount = authModule.g;
const isRateLimited = authModule.i;
const recordLoginAttempt = authModule.r;
const saveMediaFile = mediaModule.s;

console.log('====================================================');
console.log('RUNNING AUTOMATED SECURITY HARDENING TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exit(1);
  }
}

// 1. Password Security (Argon2id)
console.log('--- Test Group 1: Password Cryptography (Argon2id) ---');
const testPassword = 'SecureAdminPassword123!@#';
const salt = crypto.randomBytes(16);
const hashedPassword = await argon2id({
  password: testPassword,
  salt,
  parallelism: 1,
  iterations: 3,
  memorySize: 65536,
  hashLength: 32,
  outputType: 'encoded',
});

assert(hashedPassword.startsWith('$argon2id$'), 'Argon2id produces standard RFC-compliant encoded hash');
assert(await argon2Verify({ password: testPassword, hash: hashedPassword }), 'Correct password verifies successfully with Argon2id');
assert(!(await argon2Verify({ password: 'WrongPassword!', hash: hashedPassword })), 'Incorrect password rejected');

// 2. Single-Admin Gating & Setup Reuse Prevention
const hasDb = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);

if (hasDb) {
  console.log('\n--- Test Group 2: Single-Admin Gating ---');
  const adminCount = await getAdminUserCount();
  assert(adminCount >= 1, `Existing administrator account detected (count: ${adminCount})`);

  // 3. Login Rate Limiting & Account Lockout
  console.log('\n--- Test Group 3: Rate Limiting & Lockout Defense ---');
  const testIp = '198.51.100.99';
  for (let i = 0; i < 5; i++) {
    await recordLoginAttempt(testIp, false);
  }
  assert(await isRateLimited(testIp), 'IP address locked after 5 failed login attempts');
  const loginResult = await authenticateAdmin('admin@example.com', 'wrongpassword', testIp);
  assert(loginResult.error?.includes('locked'), 'Locked IP rejected with rate limit message');
} else {
  console.log('\n--- Test Groups 2 & 3: Database Security (Skipped: DATABASE_URL not set in offline test environment) ---');
}

// 4. TOTP RFC 6238 Multi-Factor Authentication
console.log('\n--- Test Group 4: Multi-Factor Authentication (RFC 6238 TOTP) ---');
const totpSecret = generateBase32Secret(20);
assert(totpSecret.length === 32, 'Base32 secret generated with 32 characters (20 bytes)');
const currentCode = generateTOTPCode(totpSecret);
assert(/^\d{6}$/.test(currentCode), 'TOTP code is exactly 6 digits');
assert(verifyTOTPCode(totpSecret, currentCode), 'Current TOTP code verifies successfully within window');
assert(!verifyTOTPCode(totpSecret, '000000'), 'Invalid TOTP code rejected');

// 5. MFA Recovery Codes (Single-Use Hashed)
console.log('\n--- Test Group 5: MFA Recovery Codes ---');
const { plainCodes, hashedCodes } = generateRecoveryCodes(8);
assert(plainCodes.length === 8 && hashedCodes.length === 8, '8 recovery codes generated');
const firstRecoveryCode = plainCodes[0];
const recoveryResult = verifyAndConsumeRecoveryCode(firstRecoveryCode, hashedCodes);
assert(recoveryResult.valid, 'Valid recovery code accepted');
assert(recoveryResult.remainingHashedCodes.length === 7, 'Used recovery code consumed from remaining set');
const reuseResult = verifyAndConsumeRecoveryCode(firstRecoveryCode, recoveryResult.remainingHashedCodes);
assert(!reuseResult.valid, 'Consumed recovery code rejected on second use (Single-use guarantee)');

// 6. Media File Security & Anti-XSS
console.log('\n--- Test Group 6: Media File Validation & Anti-XSS ---');
const maliciousSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="10"/></svg>');
const svgResult = await saveMediaFile(maliciousSvg, 'exploit.svg', 'image/svg+xml');
assert(!svgResult.success, 'Malicious SVG containing <script> rejected');

const onloadSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="10"/></svg>');
const onloadResult = await saveMediaFile(onloadSvg, 'onload.svg', 'image/svg+xml');
assert(!onloadResult.success, 'Malicious SVG containing onload handler rejected');

const foreignObjectSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>');
const foResult = await saveMediaFile(foreignObjectSvg, 'fo.svg', 'image/svg+xml');
assert(!foResult.success, 'Malicious SVG containing <foreignObject> rejected');

const fakeJpg = Buffer.from('Plain text masquerading as JPEG file content');
const fakeResult = await saveMediaFile(fakeJpg, 'fake.jpg', 'image/jpeg');
assert(!fakeResult.success, 'Spoofed file without valid JPEG magic bytes rejected');

if (hasDb) {
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const pngResult = await saveMediaFile(validPngHeader, 'valid-header.png', 'image/png');
  assert(pngResult.success, 'Valid PNG header accepted with sanitized storage');
}

console.log(`\n====================================================`);
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests} security assertions verified.`);
console.log(`====================================================\n`);
process.exit(0);
