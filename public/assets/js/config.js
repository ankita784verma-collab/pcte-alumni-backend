/**
 * Where is the API?
 *  - Site served by the backend itself (Render URL, or localhost:5000): same-origin /api  (no setup needed)
 *  - Site on Vercel: PRODUCTION_API below -> set it to your Render URL + /api
 *  - Live Server / file preview (port 5500 etc.): http://localhost:5000/api
 */
(function () {
  var PRODUCTION_API = 'https://YOUR-SERVICE.onrender.com/api';
  var h = location.hostname, port = location.port;
  var onVercel = /\.vercel\.app$/.test(h);
  var devPreview = location.protocol === 'file:' || ((h === 'localhost' || h === '127.0.0.1') && port === '5500');
  window.PCTE_API_BASE = onVercel ? PRODUCTION_API : (devPreview ? 'http://localhost:5000/api' : '/api');
})();
