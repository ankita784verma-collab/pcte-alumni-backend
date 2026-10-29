require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();

// Middlewares
// FRONTEND_ORIGIN can be one URL or a comma-separated list (no trailing slashes),
// e.g. https://my-app.vercel.app,https://my-app-git-main-me.vercel.app
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500')
  .split(',').map(o => o.trim().replace(/\/$/, '')).filter(Boolean)
  .concat(['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000']);
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';

app.set('trust proxy', 1);
app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  let ok = !origin;                                   // curl, health checks, server-to-server
  if (origin) {
    let sameOrigin = false;                           // site served by this very server
    try { sameOrigin = new URL(origin).host === req.headers.host; } catch (e) {}
    ok = sameOrigin || allowedOrigins.includes(origin) ||
         (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin));
  }
  if (ok) return callback(null, { origin: true });
  callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Frontend (static site) is bundled in ./public so ONE Render service serves site + API
app.use(express.static(path.join(__dirname, 'public')));

// 404 handler for unmatched API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = /CORS/.test(err.message) ? 403 : 500;
  res.status(status).json({ success: false, message: status === 403 ? err.message : 'Internal server error.' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`===============================================`);
  console.log(`🚀 PCTE Alumni Backend running on port ${PORT}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);

  // Test MySQL connection
  try {
    await db.query('SELECT 1');
    console.log(`✅ PostgreSQL connected: ${process.env.DB_NAME || 'database'}`);
  } catch (err) {
    console.warn(`⚠️  PostgreSQL connection check failed: ${err.message}`);
    console.warn(`💡 Tip: Check DATABASE_URL and that schema_postgres.sql has been run.`);
  }
});