require('dotenv').config();
const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  // Render / Railway / Neon etc. give a full connection URL.
  // Render's *internal* URL does not need SSL; the external one does.
  const needsSsl = process.env.DB_SSL === 'true' ||
    /render\.com|neon\.tech|supabase\.co|sslmode=require/.test(process.env.DATABASE_URL);
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false
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

// Helper that keeps the old mysql2-style call shape: `const [rows] = await db.query(sql, params)`.
//  - converts ? placeholders to $1, $2 ...
//  - for INSERTs, appends RETURNING * and exposes the new primary key as rows.insertId
const db = {
  query: async (sql, params = []) => {
    let text = sql.trim().replace(/;$/, '');
    const isInsert = /^insert\s/i.test(text);
    if (isInsert && !/\breturning\b/i.test(text)) text += ' RETURNING *';
    let i = 0;
    text = text.replace(/\?/g, () => `$${++i}`);
    const result = await pool.query(text, params);
    const rows = result.rows;
    if (isInsert && rows[0]) rows.insertId = Object.values(rows[0])[0];
    return [rows];
  }
};

module.exports = db;
