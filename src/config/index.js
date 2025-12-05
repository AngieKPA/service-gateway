require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  services: {
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:8000'
  },
  database: {
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    mongo: process.env.MONGO_URI || 'mongodb://localhost:27017',
    mongoDb: process.env.MONGO_DB || 'gateway_logs'
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    stockWindowMs: parseInt(process.env.STOCK_LIMIT_WINDOW_MS) || 60000,
    stockMaxRequests: parseInt(process.env.STOCK_LIMIT_MAX_REQUESTS) || 50
  }
};

// Validar configuraciones requeridas
if (!config.security.jwtSecret || config.security.jwtSecret === 'industrial-security-secret-2024-change-in-production') {
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET es el valor por defecto. Cambia en producción!');
}

module.exports = config;