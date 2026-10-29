require('dotenv').config();
const mysql = require('mysql2');

let pool;

if (process.env.DATABASE_URL) {
  // Direct connection string (Render / Railway / Cloud MySQL)
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Individual connection parameters with cloud provider fallbacks
  pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD !== undefined 
      ? process.env.DB_PASSWORD 
      : (process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : ''),
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'pcte_alumni_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
}

module.exports = pool.promise();