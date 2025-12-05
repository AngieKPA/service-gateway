const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stock.controller');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { stockLimiter, ipFilter } = require('../middleware/rateLimiter');

// Middleware para todas las rutas de stock
router.use(authenticateToken);
router.use(ipFilter);

// Consultar stock (con rate limiting específico)
router.post('/stock', stockLimiter, (req, res) => {
  stockController.getStock(req, res);
});

// Endpoints de administración (solo admin)
router.post('/stock/admin/cache', authorizeRole('admin'), (req, res) => {
  stockController.manageCache(req, res);
});

// Endpoint de prueba con datos simulados
router.get('/stock/test/:productId', (req, res) => {
  const { productId } = req.params;
  const mockData = stockController.getFallbackStockData(productId, 'BOD-TEST');
  
  res.json({
    ...mockData,
    metadata: {
      source: 'test',
      note: 'Datos de prueba - No consulta base de datos real'
    }
  });
});

// Endpoint para simular latencia (para pruebas)
router.post('/stock/simulate-delay', authorizeRole('admin'), (req, res) => {
  const { delay = 5000 } = req.body; // Default 5 segundos
  
  setTimeout(() => {
    res.json({
      message: `Respuesta con delay de ${delay}ms`,
      simulatedDelay: delay,
      timestamp: new Date().toISOString(),
      note: 'Este endpoint solo para pruebas de latencia'
    });
  }, delay);
});

module.exports = router;