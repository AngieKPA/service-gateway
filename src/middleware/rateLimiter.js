// Este es para la proteccion de los DOS:
  // apilimiter:   limita las request generales a 100 ccada 15 minutos
  //stocklimiter  limita las consultas del stock por minuto
  // ipsblacklist  clase para bloquear ips malicioso en redis
  // ip filter   middleware verifica si la ip esta bloqueada antes de proveer la request
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { getRedisClient } = require('../config/database');

// Rate limiting general para toda la API
const apiLimiter = rateLimit({
  windowMs: config.rateLimiting.windowMs, // 15 minutos
  max: config.rateLimiting.maxRequests,   // 100 requests
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Por favor, espere 15 minutos antes de hacer más solicitudes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // No aplicar rate limiting a health checks
  skip: (req) => req.path === '/health' || req.path === '/'
});

// Rate limiting específico para consultas de stock
const stockLimiter = rateLimit({
  windowMs: config.rateLimiting.stockWindowMs, // 1 minuto
  max: config.rateLimiting.stockMaxRequests,   // 50 requests
  message: {
    error: 'Límite de consultas excedido',
    message: 'Máximo 50 consultas de stock por minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Solo aplicar a endpoints de stock
  skip: (req) => !req.path.includes('/stock')
});

// Sistema de IP blacklist usando Redis
class IPBlacklist {
  constructor() {
    this.redisClient = getRedisClient();
  }
  
  // Verificar si una IP está bloqueada
  async isBlocked(ip) {
    try {
      const blocked = await this.redisClient.get(`blacklist:${ip}`);
      return blocked !== null;
    } catch (error) {
      console.error('Error verificando IP blacklist:', error);
      return false;
    }
  }
  
  // Bloquear una IP por cierto tiempo
  async blockIP(ip, reason = 'Exceso de solicitudes', minutes = 60) {
    try {
      await this.redisClient.setEx(
        `blacklist:${ip}`,
        minutes * 60, // Segundos
        JSON.stringify({
          reason,
          blockedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + minutes * 60000).toISOString()
        })
      );
      console.log(`🛑 IP ${ip} bloqueada por ${minutes} minutos. Razón: ${reason}`);
    } catch (error) {
      console.error('Error bloqueando IP:', error);
    }
  }
  
  // Desbloquear una IP
  async unblockIP(ip) {
    try {
      await this.redisClient.del(`blacklist:${ip}`);
      console.log(`✅ IP ${ip} desbloqueada`);
    } catch (error) {
      console.error('Error desbloqueando IP:', error);
    }
  }
}

// Middleware para filtrar IPs bloqueadas
async function ipFilter(req, res, next) {
  const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  try {
    const blacklist = new IPBlacklist();
    const isBlocked = await blacklist.isBlocked(clientIP);
    
    if (isBlocked) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Tu IP ha sido temporalmente bloqueada'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en filtro de IP:', error);
    next(); // Continuar si hay error en el filtro
  }
}

module.exports = {
  apiLimiter,
  stockLimiter,
  IPBlacklist,
  ipFilter
};