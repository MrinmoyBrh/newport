import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
const { Pool } = pg;

// Load .env.local
const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

// Make sure session secret is set for test
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-verify-1234567890';
}

console.log('--- 1. Testing Neon Postgres Connection with Pool ---');
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in .env.local!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Verify tables
const tablesResult = await pool.query(`
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
`);
console.log(`Found ${tablesResult.rows.length} tables in Neon PostgreSQL.`);

// Verify admin_users
const adminUsersResult = await pool.query('SELECT id, username, email, role, mfa_enabled FROM admin_users;');
console.log(`admin_users count: ${adminUsersResult.rows.length}`);
if (adminUsersResult.rows.length > 0) {
  console.log(`Active Admin: ${adminUsersResult.rows[0].username} (${adminUsersResult.rows[0].email})`);
}

// Verify projects
const projectsResult = await pool.query('SELECT id, title, slug, placement FROM projects;');
console.log(`projects count: ${projectsResult.rows.length}`);

// Verify skills
const skillsResult = await pool.query('SELECT COUNT(*)::int as count FROM skills;');
console.log(`skills count: ${skillsResult.rows[0].count}`);

// Test HMAC Session Token generation
import crypto from 'node:crypto';
const token = crypto.randomBytes(32).toString('hex');
const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(token).digest('hex');
console.log(`Session HMAC-SHA256 generation verified: ${hmac.slice(0, 16)}...`);

await pool.end();
console.log('All Neon PostgreSQL queries verified successfully!');
