const inventoryProxy = require('../services/inventory.proxy');
const cacheService = require('../services/cache.service');
const { getMongoDb } = require('../config/database');

class HealthController {
  // Health check básico
  async basicHealth(req, res) {
    res.json({
      status: 'healthy',
      service: 'gateway',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  }
  
  // Health check detallado con dependencias
  async detailedHealth(req, res) {
    const health = {
      status: 'healthy',
      service: 'gateway',
      timestamp: new Date().toISOString(),
      dependencies: {},
      checks: []
    };
    
    try {
      // 1. Verificar Redis (cache)
      const cacheStats = await cacheService.getStats();
      health.dependencies.redis = {
        connected: cacheStats.connected,
        totalKeys: cacheStats.totalKeys || 0,
        stockKeys: cacheStats.stockKeys || 0
      };
      
      if (!cacheStats.connected) {
        health.status = 'degraded';
        health.checks.push({
          service: 'redis',
          status: 'unhealthy',
          message: 'Redis no está conectado'
        });
      } else {
        health.checks.push({
          service: 'redis',
          status: 'healthy',
          message: 'Redis conectado correctamente'
        });
      }
      
      // 2. Verificar MongoDB (auditoría)
      try {
        const mongoDb = getMongoDb();
        await mongoDb.command({ ping: 1 });
        health.dependencies.mongodb = {
          connected: true,
          database: process.env.MONGO_DB
        };
        health.checks.push({
          service: 'mongodb',
          status: 'healthy',
          message: 'MongoDB conectado correctamente'
        });
      } catch (mongoError) {
        health.dependencies.mongodb = {
          connected: false,
          error: mongoError.message
        };
        health.status = 'degraded';
        health.checks.push({
          service: 'mongodb',
          status: 'unhealthy',
          message: 'MongoDB no está conectado'
        });
      }
      
      // 3. Verificar servicio de inventario
      const inventoryHealth = await inventoryProxy.healthCheck();
      health.dependencies.inventory_service = inventoryHealth;
      
      if (inventoryHealth.healthy) {
        health.checks.push({
          service: 'inventory',
          status: 'healthy',
          message: 'Servicio de inventario disponible'
        });
      } else {
        health.status = 'degraded';
        health.checks.push({
          service: 'inventory',
          status: 'unhealthy',
          message: `Servicio de inventario no disponible: ${inventoryHealth.error}`
        });
      }
      
      // 4. Verificar uso de memoria
      const memoryUsage = process.memoryUsage();
      health.memory = {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
      };
      
      // 5. Verificar uptime
      health.uptime = `${Math.round(process.uptime())} segundos`;
      
      res.json(health);
      
    } catch (error) {
      console.error('Error en health check:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Métricas del sistema
  async metrics(req, res) {
    const metrics = {
      timestamp: new Date().toISOString(),
      nodejs: {
        version: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      system: {
        arch: process.arch,
        platform: process.platform,
        cpus: require('os').cpus().length
      },
      requests: {
        // Aquí irían métricas de requests si implementamos contadores
        total: 0,
        successful: 0,
        failed: 0
      }
    };
    
    res.json(metrics);
  }
}

module.exports = new HealthController();