//Endpoints de autenticacion
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { apiLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

// Ruta pública: Login
router.post('/login', apiLimiter, (req, res) => {
  authController.login(req, res);
});

// Ruta pública: Verificar token
router.post('/verify', apiLimiter, (req, res) => {
  authController.verify(req, res);
});

// Ruta protegida: Obtener información del usuario actual
router.get('/me', authenticateToken, (req, res) => {
  authController.me(req, res);
});

// Ruta protegida: Logout (en JWT es del lado cliente, pero podemos invalidar)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    message: 'Logout exitoso',
    note: 'Para logout completo, elimina el token del cliente'
  });
});

module.exports = router;