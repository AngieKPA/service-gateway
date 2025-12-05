// Regiostra todos los eventos importantes del sistema   almacena en mongo db los logs 
const { getMongoDb } = require('../config/database');

class AuditService {
  constructor() {
    this.db = getMongoDb();
    this.auditCollection = this.db.collection('audit_logs');
  }
  
  // Registrar un evento de auditoría
  async logEvent(event) {
    try {
      const auditLog = {
        timestamp: new Date(),
        ...event,
        environment: process.env.NODE_ENV || 'development'
      };
      
      await this.auditCollection.insertOne(auditLog);
      
      // Solo loggear en desarrollo para no saturar consola
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Auditoría:', {
          action: event.action,
          user: event.userId,
          resource: event.resource
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error registrando auditoría:', error);
      return false;
    }
  }
  
  // Registrar login exitoso
  async logLoginSuccess(userId, ip) {
    return this.logEvent({
      action: 'LOGIN_SUCCESS',
      userId,
      ip,
      resource: 'auth',
      details: { type: 'password' }
    });
  }
  
  // Registrar login fallido
  async logLoginFailed(username, ip, reason) {
    return this.logEvent({
      action: 'LOGIN_FAILED',
      userId: username,
      ip,
      resource: 'auth',
      details: { reason }
    });
  }
  
  // Registrar consulta de stock
  async logStockQuery(userId, productId, ip, cached = false, responseTime = 0) {
    return this.logEvent({
      action: 'STOCK_QUERY',
      userId,
      ip,
      resource: `product:${productId}`,
      details: {
        cached,
        responseTime: `${responseTime}ms`,
        meetsASR: responseTime < 3000
      }
    });
  }
  
  // Registrar intento de ataque
  async logAttackAttempt(ip, attackType, details = {}) {
    return this.logEvent({
      action: 'ATTACK_ATTEMPT',
      userId: 'system',
      ip,
      resource: 'security',
      details: {
        attackType,
        ...details
      }
    });
  }
  
  // Obtener logs recientes
  async getRecentLogs(limit = 100) {
    try {
      return await this.auditCollection
        .find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error obteniendo logs:', error);
      return [];
    }
  }
}

module.exports = new AuditService();