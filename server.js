require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();

// Enable CORS for all origins (GitHub Pages, localhost, custom domains)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloud Health check probes (always return HTTP 200 for Render / cloud deployment checks)
app.get(['/health', '/healthz'], (req, res) => {
  res.status(200).json({ status: 'healthy', uptime: process.uptime() });
});

// Root route status info
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    success: true,
    message: '🚀 PCTE Alumni Backend API is active and running!',
    health: '/api/health',
    endpoints: {
      auth: ['/api/login', '/api/register', '/api/me'],
      alumni: '/api/alumni',
      events: '/api/events',
      admin: '/api/admin/stats',
      leads: '/api/leads',
      contact: '/api/contact'
    }
  });
});

// API Routes
app.use('/api', apiRoutes);

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
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  process.exit(0);
});

// Start Server - Bind strictly to 0.0.0.0 so Render port scanner detects it immediately
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, async () => {
  console.log(`===============================================`);
  console.log(`🚀 PCTE Alumni Backend running on http://${HOST}:${PORT}`);
  console.log(`📡 API Health: http://${HOST}:${PORT}/api/health`);
  console.log(`===============================================`);

  try {
    await db.query('SELECT 1');
    await db.initSchema();
  } catch (err) {
    console.warn(`Startup DB check: ${err.message}`);
  }
});
