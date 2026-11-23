import pg from 'pg';
import fs from 'node:fs';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/^DATABASE_URL=(.+)$/m);
const connectionString = match[1].trim().replace(/^["']|["']$/g, '');
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

function toPgSql(sql) {
  let count = 1;
  return sql.replace(/\?/g, () => `$${count++}`);
}

class PgStmt {
  constructor(sql) {
    this.sql = toPgSql(sql);
  }
  async all(...params) {
    const res = await pool.query(this.sql, params);
    return res.rows;
  }
  async get(...params) {
    const res = await pool.query(this.sql, params);
    return res.rows[0] || null;
  }
  async run(...params) {
    const res = await pool.query(this.sql, params);
    return { changes: res.rowCount };
  }
}

const stmt1 = new PgStmt('SELECT id, name FROM skills WHERE category_id = ? ORDER BY display_order ASC LIMIT ?');
const rows = await stmt1.all('backend-web', 2);
console.log('Query result:', rows);

const stmt2 = new PgStmt('SELECT COUNT(*) as count FROM projects WHERE is_published = ?');
const countRow = await stmt2.get(1);
console.log('Get result:', countRow);

await pool.end();
