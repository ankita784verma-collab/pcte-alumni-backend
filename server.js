require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets and HTML files from current directory
app.use(express.static(path.join(__dirname)));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes
app.use('/api', apiRoutes);

// Cloud Health check probes (always return HTTP 200 for Render / cloud deployment checks)
app.get(['/health', '/healthz'], (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Root route: serves index.html if present, else JSON welcome info
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).json({
    status: 'ok',
    success: true,
    message: '🚀 PCTE Alumni Backend API is active and running!',
    health: '/api/health'
  });
});

// Catch-all: for non-API requests, fallback to index.html or 404
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(404).send('Page not found');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  process.exit(0);
});

// Start Server - Bind strictly to 0.0.0.0 so Render detects port immediately
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`===============================================`);
  console.log(`🚀 PCTE Alumni Server running on http://${HOST}:${PORT}`);
  console.log(`📡 API Health: http://${HOST}:${PORT}/api/health`);
  console.log(`===============================================`);

  try {
    await db.query('SELECT 1');
    await db.initSchema();
  } catch (err) {
    console.warn(`Startup DB check: ${err.message}`);
  }
});
