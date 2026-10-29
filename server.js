require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();

// Middlewares
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
  },
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

  // Test MySQL connection
  try {
    await db.query('SELECT 1');
    console.log(`✅ MySQL Database connected: ${process.env.DB_NAME || 'pcte_alumni_db'}`);
  } catch (err) {
    console.warn(`⚠️  MySQL Database connection check failed: ${err.message}`);
    console.warn(`💡 Tip: Ensure MySQL / XAMPP is running and 'pcte_alumni_db' is imported.`);
  }
});