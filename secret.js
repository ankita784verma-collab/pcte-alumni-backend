// Single source of truth for the JWT signing secret.
// If JWT_SECRET is missing we fall back to a random per-process secret instead of
// crashing the deploy (logins just reset on each restart). Set JWT_SECRET on Render!
const crypto = require('crypto');
let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(48).toString('hex');
  console.warn('WARNING: JWT_SECRET is not set - using a temporary random secret. Set JWT_SECRET in Render > Environment.');
}
module.exports = secret;
