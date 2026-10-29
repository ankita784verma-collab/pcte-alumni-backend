require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;

if (process.env.DATABASE_URL) {
  // Render, Railway, Supabase, Neon or other cloud providers
  const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
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

// Unified query wrapper supporting both MySQL ? and PG $1, $2 placeholders,
// plus automatic RETURNING * on INSERT for postgres so result.insertId works.
const db = {
  pool,

  query: async (sql, params = []) => {
    let pgSql = sql.trim();
    let i = 0;
    // Replace MySQL ? with $1, $2, ...
    pgSql = pgSql.replace(/\?/g, () => `$${++i}`);

    const isInsert = /^insert\s+into/i.test(pgSql);
    // If INSERT and no RETURNING clause, automatically add RETURNING *
    if (isInsert && !/returning/i.test(pgSql)) {
      pgSql += ' RETURNING *';
    }

    const result = await pool.query(pgSql, params);
    const rows = result.rows || [];

    // Polyfill insertId and affectedRows for smooth compatibility
    if (isInsert && rows.length > 0) {
      const first = rows[0];
      rows.insertId = first.user_id || first.alumni_id || first.event_id || first.rsvp_id || first.request_id || first.lead_id || first.id;
    }
    rows.rowCount = result.rowCount;

    return [rows, result];
  },

  // Auto-initialize schema on startup if connected to a fresh database
  initSchema: async () => {
    try {
      const schemaPath = path.join(__dirname, 'schema_postgres.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('✅ PostgreSQL Database schema & seed verified successfully.');
      }
    } catch (err) {
      console.warn(`⚠️ Database schema check notice: ${err.message}`);
    }
  }
};

module.exports = db;
