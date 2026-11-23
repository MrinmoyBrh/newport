import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const connectionString = match[1].trim().replace(/^["']|["']$/g, '');

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  const res = await pool.query('SELECT NOW() as now, version() as version;');
  console.log('[OK] Connected to Neon PostgreSQL successfully!');
  console.log('[INFO] Server time:', res.rows[0].now);
  console.log('[INFO] Version snippet:', res.rows[0].version.slice(0, 50));
  await pool.end();
} catch (err) {
  console.error('[ERROR] Failed to connect to Neon:', err.message);
  await pool.end();
  process.exit(1);
}
