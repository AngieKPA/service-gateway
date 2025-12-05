//endpoint monitoreo del sistema
const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

// Health check básico (para load balancers)
router.get('/', (req, res) => {
  healthController.basicHealth(req, res);
});

// Health check detallado
router.get('/detailed', (req, res) => {
  healthController.detailedHealth(req, res);
});

// Métricas del sistema
router.get('/metrics', (req, res) => {
  healthController.metrics(req, res);
});

// Verificar si un servicio específico está disponible
router.get('/check/:service', (req, res) => {
  const { service } = req.params;
  
  switch (service) {
    case 'redis':
      // Verificar Redis
      const { getRedisClient } = require('../config/database');
      const redisClient = getRedisClient();
      redisClient.ping()
        .then(() => res.json({ service: 'redis', status: 'healthy' }))
        .catch(() => res.json({ service: 'redis', status: 'unhealthy' }));
      break;
      
    case 'mongo':
      // Verificar MongoDB
      const { getMongoDb } = require('../config/database');
      const mongoDb = getMongoDb();
      mongoDb.command({ ping: 1 })
        .then(() => res.json({ service: 'mongodb', status: 'healthy' }))
        .catch(() => res.json({ service: 'mongodb', status: 'unhealthy' }));
      break;
      
    case 'inventory':
      // Verificar Inventory Service
      const inventoryProxy = require('../services/inventory.proxy');
      inventoryProxy.healthCheck()
        .then(health => res.json({ 
          service: 'inventory', 
          status: health.healthy ? 'healthy' : 'unhealthy',
          details: health
        }));
      break;
      
    default:
      res.status(404).json({
        error: 'Servicio no encontrado',
        message: `Servicio "${service}" no monitorado`
      });
  }
});

module.exports = router;