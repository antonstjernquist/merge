export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  sharedToken: process.env.SHARED_TOKEN || 'dev-token',
  sessionTimeoutMs: parseInt(process.env.SESSION_TIMEOUT_MS || '3600000', 10),
};
