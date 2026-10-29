/**
 * PCTE Alumni Talks — Configuration
 * Automatically points to the correct backend API:
 * - On Render: same-origin /api
 * - On GitHub Pages / Vercel: Render cloud endpoint
 * - On Localhost / Live Server (port 5500, 3000, 8000): http://localhost:5000/api
 */
(function () {
  var PRODUCTION_API = 'https://pcte-alumni-backendpcte-alumni-backend.onrender.com/api';
  var h = location.hostname, port = location.port;
  var isCloudFrontend = /\.vercel\.app$/.test(h) || /\.github\.io$/.test(h);
  var devPreview = location.protocol === 'file:' || ((h === 'localhost' || h === '127.0.0.1') && (port === '5500' || port === '3000' || port === '8000'));
  
  window.PCTE_API_BASE = isCloudFrontend ? PRODUCTION_API : (devPreview ? 'http://localhost:5000/api' : '/api');
  window.PCTE_API_URL = window.PCTE_API_BASE;
})();
