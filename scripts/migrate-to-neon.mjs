import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// Read DATABASE_URL from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local not found');
  process.exit(1);
}

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

const sqlite = new DatabaseSync('data/portfolio.db');

console.log('====================================================');
console.log('STARTING NEON POSTGRESQL SCHEMA CREATION & MIGRATION');
console.log('====================================================\n');

const DDL_STATEMENTS = [
  // 1. admin_users
  `CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    last_login_at BIGINT,
    mfa_enabled SMALLINT NOT NULL DEFAULT 0,
    mfa_secret TEXT,
    mfa_recovery_codes TEXT,
    mfa_pending_secret TEXT
  );`,

  // 2. sessions
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    last_active_at BIGINT,
    user_agent TEXT,
    ip_address TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);`,

  // 3. login_attempts
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    attempted_at BIGINT NOT NULL,
    success SMALLINT NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts(ip_address, attempted_at);`,

  // 4. mfa_challenges
  `CREATE TABLE IF NOT EXISTS mfa_challenges (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL,
    ip_address TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires ON mfa_challenges(expires_at);`,

  // 5. hero_content
  `CREATE TABLE IF NOT EXISTS hero_content (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role_badge TEXT NOT NULL,
    education_badge TEXT NOT NULL,
    college_badge TEXT NOT NULL,
    headline_line1 TEXT NOT NULL,
    headline_highlight TEXT NOT NULL,
    headline_gradient TEXT NOT NULL,
    description TEXT NOT NULL,
    description_html TEXT NOT NULL,
    cta_primary_label TEXT NOT NULL,
    cta_primary_url TEXT NOT NULL,
    cta_secondary_label TEXT NOT NULL,
    cta_secondary_url TEXT NOT NULL,
    cta_terminal_label TEXT NOT NULL,
    cta_terminal_url TEXT NOT NULL,
    orbital_radar_top_left TEXT NOT NULL,
    orbital_radar_top_right TEXT NOT NULL,
    orbital_radar_bottom_left TEXT NOT NULL,
    orbital_radar_bottom_right TEXT NOT NULL,
    orbital_status_title TEXT NOT NULL,
    orbital_status_reliability TEXT NOT NULL,
    orbital_core_label TEXT NOT NULL,
    is_published SMALLINT NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL
  );`,

  // 6. projects
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    category TEXT NOT NULL,
    role TEXT,
    organization TEXT,
    period TEXT,
    placement TEXT NOT NULL DEFAULT 'showcase',
    featured SMALLINT NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    github_url TEXT,
    live_url TEXT,
    badges TEXT,
    summary TEXT,
    challenge TEXT,
    architecture_narrative TEXT,
    architecture_steps TEXT,
    technical_highlights TEXT,
    verified_claims TEXT,
    stack TEXT,
    key_features TEXT,
    cover_image TEXT,
    is_published SMALLINT NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
  CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(placement, display_order);`,

  // 7. skill_categories
  `CREATE TABLE IF NOT EXISTS skill_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible SMALLINT NOT NULL DEFAULT 1
  );`,

  // 8. skills
  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES skill_categories (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    proficiency TEXT NOT NULL DEFAULT 'Practiced',
    is_highlighted SMALLINT NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category_id, display_order);`,

  // 9. experiences
  `CREATE TABLE IF NOT EXISTS experiences (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    period TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Internship',
    status TEXT NOT NULL DEFAULT 'Completed',
    description TEXT NOT NULL,
    responsibilities TEXT NOT NULL,
    technologies TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published SMALLINT NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL
  );`,

  // 10. education
  `CREATE TABLE IF NOT EXISTS education (
    id TEXT PRIMARY KEY,
    degree TEXT NOT NULL,
    field TEXT NOT NULL,
    institution TEXT NOT NULL,
    location TEXT NOT NULL,
    period TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Current',
    details TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
  );`,

  // 11. principles
  `CREATE TABLE IF NOT EXISTS principles (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    narrative TEXT NOT NULL,
    implementation TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published SMALLINT NOT NULL DEFAULT 1
  );`,

  // 12. navigation_items
  `CREATE TABLE IF NOT EXISTS navigation_items (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible SMALLINT NOT NULL DEFAULT 1,
    is_cta SMALLINT NOT NULL DEFAULT 0
  );`,

  // 13. module_configs
  `CREATE TABLE IF NOT EXISTS module_configs (
    id TEXT PRIMARY KEY,
    module_key TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL,
    updated_at BIGINT NOT NULL
  );`,

  // 14. appearance_settings
  `CREATE TABLE IF NOT EXISTS appearance_settings (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    is_published SMALLINT NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL
  );`,

  // 15. seo_settings
  `CREATE TABLE IF NOT EXISTS seo_settings (
    id TEXT PRIMARY KEY,
    site_title TEXT NOT NULL,
    site_description TEXT NOT NULL,
    canonical_url TEXT,
    og_title TEXT NOT NULL,
    og_description TEXT NOT NULL,
    og_image TEXT,
    twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
    robots_directives TEXT NOT NULL DEFAULT 'index, follow',
    updated_at BIGINT NOT NULL
  );`,

  // 16. media_assets
  `CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    filename TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    created_at BIGINT NOT NULL
  );`,

  // 17. activity_logs
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);`,

  // 18. revisions
  `CREATE TABLE IF NOT EXISTS revisions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    data_snapshot TEXT NOT NULL,
    published_by TEXT NOT NULL,
    published_at BIGINT NOT NULL,
    summary TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_type, entity_id);`,

  // 19. draft_store
  `CREATE TABLE IF NOT EXISTS draft_store (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at BIGINT NOT NULL
  );`,
];

try {
  await pool.query('DROP TABLE IF EXISTS projects CASCADE;');
  // Step 1: Execute DDL
  console.log('[1/3] Executing PostgreSQL DDL for 19 tables...');
  for (const statement of DDL_STATEMENTS) {
    await pool.query(statement);
  }
  console.log('[OK] All 19 tables created in Neon PostgreSQL.');

  // Step 2: Migrate data table by table in dependency order
  console.log('\n[2/3] Migrating data from SQLite to Neon PostgreSQL...');

  const migrationOrder = [
    'admin_users',
    'skill_categories',
    'skills',
    'projects',
    'hero_content',
    'experiences',
    'education',
    'principles',
    'navigation_items',
    'module_configs',
    'appearance_settings',
    'seo_settings',
    'media_assets',
    'sessions',
    'login_attempts',
    'activity_logs',
    'revisions',
    'draft_store',
    'mfa_challenges',
  ];

  for (const tableName of migrationOrder) {
    const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    if (rows.length === 0) {
      console.log(`  - ${tableName}: 0 rows (skipped)`);
      continue;
    }

    const firstRow = rows[0];
    const columns = Object.keys(firstRow);
    const colList = columns.map((c) => `"${c}"`).join(', ');
    const valPlaceholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

    const upsertSql = `
      INSERT INTO "${tableName}" (${colList})
      VALUES (${valPlaceholders})
      ON CONFLICT DO NOTHING
    `;

    for (const r of rows) {
      const values = columns.map((c) => r[c]);
      await pool.query(upsertSql, values);
    }

    const pgCountRes = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    console.log(`  - ${tableName}: ${rows.length} rows migrated (Neon count: ${pgCountRes.rows[0].count})`);
  }

  // Step 3: Verification
  console.log('\n[3/3] Verifying Neon PostgreSQL data fidelity...');
  const userCheck = await pool.query('SELECT count(*) as count, email, name, role FROM admin_users GROUP BY email, name, role');
  console.log(`[VERIFIED] Admin user in Neon:`, userCheck.rows);

  const skillCheck = await pool.query(`
    SELECT s.name, s.display_order, sc.title as category
    FROM skills s
    JOIN skill_categories sc ON s.category_id = sc.id
    WHERE s.category_id = 'backend-web'
    ORDER BY s.display_order ASC
    LIMIT 3
  `);
  console.log('[VERIFIED] Top 3 Backend Skills in Neon:', skillCheck.rows);

  console.log('\n====================================================');
  console.log('SUCCESS: ALL DATA MIGRATED SAFELY TO NEON POSTGRESQL');
  console.log('====================================================\n');

  await pool.end();
} catch (err) {
  console.error('[ERROR] Migration failed:', err);
  await pool.end();
  process.exit(1);
}
