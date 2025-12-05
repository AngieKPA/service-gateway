const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'gateway' },
  transports: [
    // Escribir logs a consola
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          }
        )
      )
    }),
    // Escribir logs a archivo (solo en producción)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log' 
      })
    ] : [])
  ]
});

// Función para loggear requests HTTP
function logRequest(req, res, next) {
  const start = Date.now();
  
  // Loggear cuando la response termina
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.username || 'anonymous'
    });
    
    // Loggear específicamente requests lentas (> 3 segundos)
    if (duration > 3000) {
      logger.warn('Request lenta detectada', {
        url: req.url,
        duration: `${duration}ms`,
        threshold: '3000ms'
      });
    }
  });
  
  next();
}

// Función para loggear errores de seguridad
function logSecurityEvent(event, details = {}) {
  logger.warn('Evento de seguridad', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
}

// Función para loggear métricas de ASR
function logASRMetric(metric, value) {
  logger.info('Métrica ASR', {
    metric,
    value,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  logger,
  logRequest,
  logSecurityEvent,
  logASRMetric
};