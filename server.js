require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();

// Proxy and CORS support: allow all origins so requests from GitHub Pages, Vercel, localhost work seamlessly
app.set('trust proxy', 1);
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Cloud Health check probes (always return HTTP 200 for Render / cloud deployment checks)
app.get(['/health', '/healthz'], (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// API Routes
app.use('/api', apiRoutes);

// Frontend: serve static files from public/ as well as current directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// Root route: serves index.html if present, else JSON welcome info
app.get('/', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex, (err) => {
      if (err && !res.headersSent) {
        res.status(200).json({
          status: 'ok',
          success: true,
          message: '🚀 PCTE Alumni Backend API is active and running!',
          health: '/health'
        });
      }
    });
  }
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex, (err) => {
      if (err && !res.headersSent) {
        res.status(200).json({
          status: 'ok',
          success: true,
          message: '🚀 PCTE Alumni Backend API is active and running!',
          health: '/health'
        });
      }
    });
  }
  res.status(200).json({
    status: 'ok',
    success: true,
    message: '🚀 PCTE Alumni Backend API is active and running!',
    health: '/health'
  });
});

// Catch-all: for non-API requests, fallback to index.html or 404
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicIndex)) return res.sendFile(publicIndex, () => { if (!res.headersSent) res.status(404).send('Page not found'); });
  if (fs.existsSync(rootIndex)) return res.sendFile(rootIndex, () => { if (!res.headersSent) res.status(404).send('Page not found'); });
  res.status(404).send('Page not found');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return;
  const status = /CORS/.test(err.message) ? 403 : 500;
  res.status(status).json({ success: false, message: status === 403 ? err.message : 'Internal server error.' });
});

// Start Server
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`===============================================`);
  console.log(`🚀 PCTE Alumni Server running on http://${HOST}:${PORT}`);
  console.log(`📡 API Health: http://${HOST}:${PORT}/health`);
  console.log(`===============================================`);

  try {
    await db.query('SELECT 1');
    if (db.initSchema) await db.initSchema();
  } catch (err) {
    console.warn(`Startup check: ${err.message}`);
  }
});
