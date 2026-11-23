import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export interface PreparedStatement {
  all(...params: any[]): Promise<any[]>;
  get(...params: any[]): Promise<any>;
  run(...params: any[]): Promise<{ changes: number }>;
}

export interface DatabaseClient {
  prepare(sql: string): PreparedStatement;
  exec(sql: string): Promise<void>;
  isPostgres: boolean;
}

// Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, ...'
function toPgSql(sql: string): string {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

// Parse PostgreSQL INT8 / BIGINT as JavaScript numbers
pg.types.setTypeParser(20, (val: string | null) => (val === null ? null : parseInt(val, 10)));

let globalClient: DatabaseClient | null = null;
let pgPoolInstance: pg.Pool | null = null;
let schemaInitPromise: Promise<void> | null = null;

function getTargetSchema(): string {
  const schema = process.env.DATABASE_SCHEMA;
  if (schema && /^[a-zA-Z0-9_]+$/.test(schema.trim())) {
    return schema.trim();
  }
  return 'portfolio_v2';
}

async function ensureSchema(pool: pg.Pool): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      try {
        const schemaName = getTargetSchema();
        await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
        await pool.query(`SET search_path TO ${schemaName}, public;`);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS admin_users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL,
            last_login_at BIGINT,
            mfa_enabled INTEGER NOT NULL DEFAULT 0,
            mfa_secret TEXT,
            mfa_recovery_codes TEXT,
            mfa_pending_secret TEXT
          );

          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            token_hash TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            created_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            last_active_at BIGINT,
            user_agent TEXT,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES admin_users (id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
          CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

          CREATE TABLE IF NOT EXISTS login_attempts (
            id TEXT PRIMARY KEY,
            ip_address TEXT NOT NULL,
            attempted_at BIGINT NOT NULL,
            success INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);

          CREATE TABLE IF NOT EXISTS mfa_challenges (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at BIGINT NOT NULL,
            ip_address TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_mfa_challenges_expires ON mfa_challenges(expires_at);

          CREATE TABLE IF NOT EXISTS hero_content (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role_badge TEXT NOT NULL,
            education_badge TEXT NOT NULL,
            college_badge TEXT NOT NULL,
            headline_line1 TEXT NOT NULL,
            headline_highlight TEXT NOT NULL,
            headline_gradient TEXT NOT NULL,
            description TEXT NOT NULL,
            description_html TEXT,
            cta_primary_label TEXT NOT NULL,
            cta_primary_url TEXT NOT NULL,
            cta_secondary_label TEXT NOT NULL,
            cta_secondary_url TEXT NOT NULL,
            cta_terminal_label TEXT NOT NULL,
            cta_terminal_url TEXT NOT NULL,
            orbital_radar_top_left TEXT,
            orbital_radar_top_right TEXT,
            orbital_radar_bottom_left TEXT,
            orbital_radar_bottom_right TEXT,
            orbital_status_title TEXT,
            orbital_status_reliability TEXT,
            orbital_core_label TEXT,
            is_published INTEGER NOT NULL DEFAULT 0,
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            tagline TEXT NOT NULL,
            summary TEXT NOT NULL,
            category TEXT NOT NULL,
            featured INTEGER NOT NULL DEFAULT 0,
            placement TEXT NOT NULL DEFAULT 'editorial',
            hero_image TEXT,
            architecture_diagram TEXT,
            problem TEXT NOT NULL,
            solution TEXT NOT NULL,
            mechanics TEXT NOT NULL,
            metrics TEXT NOT NULL,
            badges TEXT NOT NULL,
            github_url TEXT,
            live_url TEXT,
            case_study_markdown TEXT,
            display_order INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS skill_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            tagline TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            proficiency TEXT NOT NULL DEFAULT 'Practiced',
            is_highlighted INTEGER NOT NULL DEFAULT 0,
            display_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES skill_categories (id) ON DELETE CASCADE
          );

          CREATE TABLE IF NOT EXISTS experiences (
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
            is_published INTEGER NOT NULL DEFAULT 1,
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS education (
            id TEXT PRIMARY KEY,
            degree TEXT NOT NULL,
            field TEXT NOT NULL,
            institution TEXT NOT NULL,
            location TEXT NOT NULL,
            period TEXT NOT NULL,
            status TEXT NOT NULL,
            details TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS principles (
            id TEXT PRIMARY KEY,
            number TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            narrative TEXT NOT NULL,
            implementation TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS navigation_items (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            url TEXT NOT NULL,
            display_order INTEGER NOT NULL DEFAULT 0,
            is_visible INTEGER NOT NULL DEFAULT 1,
            is_cta INTEGER NOT NULL DEFAULT 0
          );

          CREATE TABLE IF NOT EXISTS module_configs (
            id TEXT PRIMARY KEY,
            module_key TEXT UNIQUE NOT NULL,
            data TEXT NOT NULL,
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS appearance_settings (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            is_published INTEGER NOT NULL DEFAULT 1,
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS seo_settings (
            id TEXT PRIMARY KEY,
            site_title TEXT NOT NULL,
            site_description TEXT NOT NULL,
            canonical_url TEXT NOT NULL,
            og_title TEXT NOT NULL,
            og_description TEXT NOT NULL,
            og_image TEXT,
            twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
            robots_directives TEXT NOT NULL DEFAULT 'index, follow',
            updated_at BIGINT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS media_assets (
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
          );

          CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            description TEXT NOT NULL,
            created_at BIGINT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

          CREATE TABLE IF NOT EXISTS revisions (
            id TEXT PRIMARY KEY,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            data_snapshot TEXT NOT NULL,
            published_by TEXT NOT NULL,
            published_at BIGINT NOT NULL,
            summary TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_type, entity_id);

          CREATE TABLE IF NOT EXISTS draft_store (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at BIGINT NOT NULL
          );
        `);
      } catch (e) {
        console.error('[Neon Postgres] Error initializing schema:', e);
        schemaInitPromise = null;
        throw e;
      }
    })();
  }
  return schemaInitPromise;
}

function resolveDatabaseUrl(): string {
  const envVar =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;

  if (envVar && envVar.trim().length > 0) {
    return envVar.trim().replace(/^["']|["']$/g, '');
  }

  // Fallback to reading .env.local for local development if running outside Astro Vite runner
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const match = content.match(/^(?:DATABASE_URL|POSTGRES_URL)=(.+)$/m);
      if (match && match[1]) {
        const url = match[1].trim().replace(/^["']|["']$/g, '');
        if (url) return url;
      }
    }
  } catch {}

  throw new Error(
    '[Database Configuration Error] Neither DATABASE_URL nor POSTGRES_URL was found in environment variables. ' +
    'Please configure DATABASE_URL in your Vercel Project Settings (Settings -> Environment Variables) ' +
    'with your Neon PostgreSQL connection string.'
  );
}

export function getDb(): DatabaseClient {
  if (globalClient) {
    return globalClient;
  }

  const databaseUrl = resolveDatabaseUrl();

  if (!pgPoolInstance) {
    pgPoolInstance = new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pgPoolInstance.on('connect', (client) => {
      const schemaName = getTargetSchema();
      client.query(`SET search_path TO ${schemaName}, public;`).catch((err) => {
        console.error('[Neon Postgres] Error setting search_path:', err);
      });
    });

    pgPoolInstance.on('error', (err) => {
      console.error('[Neon Postgres] Unexpected client pool error:', err);
    });
  }

  const pool = pgPoolInstance;

  globalClient = {
    isPostgres: true,
    prepare(sql: string): PreparedStatement {
      const pgSql = toPgSql(sql);
      return {
        async all(...params: any[]) {
          await ensureSchema(pool);
          const res = await pool.query(pgSql, params);
          return res.rows;
        },
        async get(...params: any[]) {
          await ensureSchema(pool);
          const res = await pool.query(pgSql, params);
          return res.rows[0] || null;
        },
        async run(...params: any[]) {
          await ensureSchema(pool);
          const res = await pool.query(pgSql, params);
          return { changes: res.rowCount ?? 0 };
        },
      };
    },
    async exec(sql: string) {
      await ensureSchema(pool);
      let cleanSql = sql;
      if (/BEGIN(\s+IMMEDIATE)?\s+TRANSACTION;?/i.test(sql.trim())) {
        cleanSql = 'BEGIN;';
      }
      await pool.query(cleanSql);
    },
  };

  return globalClient;
}
