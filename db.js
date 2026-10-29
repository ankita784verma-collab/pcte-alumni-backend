require('dotenv').config();
const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  // Render / Railway / cloud providers give a full connection URL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') || process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false
  });
} else {
  pool = new Pool({
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    user:     process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pcte_alumni_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
}

// Helper: mirrors the mysql2 promise API so routes need minimal changes
// mysql2 returns [rows, fields] → we return [rows] from pg
const db = {
  query: async (sql, params = []) => {
    // Convert MySQL ? placeholders to PostgreSQL $1, $2, ...
    let pgSql = sql;
    let i = 0;
    pgSql = sql.replace(/\?/g, () => `$${++i}`);
    const result = await pool.query(pgSql, params);
    return [result.rows];   // [rows] — same shape as mysql2's [rows, fields]
  }
};

module.exports = db;