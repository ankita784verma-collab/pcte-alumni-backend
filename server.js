require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();

// Enable CORS for all origins so frontend on GitHub Pages, Vercel, localhost can connect cleanly
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files (supporting both root and frontend/ subdirectory)
app.use(express.static(path.join(__dirname, '../')));
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', apiRoutes);

// Root route fallback to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(`🚀 PCTE Alumni Backend running on port ${PORT}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);

  // Verify DB connection and auto-prime schema
  try {
    await db.query('SELECT 1');
    console.log(`✅ PostgreSQL Database connected.`);
    await db.initSchema();
  } catch (err) {
    console.warn(`⚠️ PostgreSQL connection check: ${err.message}`);
    console.warn(`💡 Tip: Check your DATABASE_URL environment variable.`);
  }
});
