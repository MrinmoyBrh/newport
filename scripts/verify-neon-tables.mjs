import pg from 'pg';
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
const connectionString = match[1].trim().replace(/^["']|["']$/g, '');

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function verify() {
  const tables = [
    'admin_users', 'sessions', 'login_attempts', 'mfa_challenges',
    'hero_content', 'projects', 'skill_categories', 'skills',
    'experiences', 'education', 'principles', 'navigation_items',
    'module_configs', 'appearance_settings', 'seo_settings',
    'media_assets', 'activity_logs', 'revisions', 'draft_store'
  ];

  console.log('====================================================');
  console.log('VERIFYING ALL 19 TABLES IN NEON POSTGRESQL');
  console.log('====================================================\n');

  for (const t of tables) {
    const res = await pool.query(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`  Table ${t.padEnd(22)}: ${res.rows[0].c} rows`);
  }

  const admin = await pool.query('SELECT username, email, role, mfa_enabled FROM admin_users LIMIT 1');
  console.log('\nAdmin record in Neon:', admin.rows[0]);

  await pool.end();
  console.log('\n[PASS] All 19 Neon tables verified intact.');
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
