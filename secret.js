// Single source of truth for the JWT signing secret.
const secret = process.env.JWT_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production.');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET not set - using an insecure dev default.');
}
module.exports = secret || 'dev_only_insecure_secret_change_me';
