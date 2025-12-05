require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

// Configuración
const config = require('./config');
const { connectDatabases, disconnectDatabases } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { logRequest } = require('./utils/logger');
const { responseWrapper } = require('./utils/response');
const authService = require('./services/auth.service');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const stockRoutes = require('./routes/stock.routes');
const healthRoutes = require('./routes/health.routes');

// Crear aplicación Express
const app = express();
const PORT = config.server.port;

// ========== MIDDLEWARES GLOBALES ==========
// Seguridad
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan(config.server.env === 'development' ? 'dev' : 'combined'));
app.use(logRequest);

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));

// Formato de respuesta estándar
app.use(responseWrapper);

// ========== RUTAS ==========
// Pública
app.use('/api/auth', authRoutes);
app.use('/health', healthRoutes);

// Protegidas (stock)
app.use('/api/v1/industrial', stockRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'Industrial Stock Gateway',
    version: '1.0.0',
    status: 'operational',
    environment: config.server.env,
    endpoints: {
      auth: '/api/auth',
      stock: '/api/v1/industrial/stock',
      health: '/health',
      docs: '/api-docs' // Podrías agregar Swagger después
    },
    asr: {
      latency: '< 3000ms para 5000 consultas/min',
      security: 'Protección contra DoS',
      maintainability: 'Cambios en < 4 horas'
    }
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`,
    availableEndpoints: [
      'GET /',
      'POST /api/auth/login',
      'POST /api/v1/industrial/stock',
      'GET /health',
      'GET /health/detailed'
    ]
  });
});

// ========== MANEJO DE ERRORES ==========
app.use(errorHandler);

// ========== INICIAR SERVIDOR ==========
async function startServer() {
  try {
    console.log('🚀 Iniciando Industrial Stock Gateway...');
    console.log(`🌍 Ambiente: ${config.server.env}`);
    
    // 1. Conectar a bases de datos
    console.log('🔗 Conectando a bases de datos...');
    await connectDatabases();
    
    // 2. Inicializar usuarios de prueba
    if (config.server.env === 'development') {
      console.log('👤 Inicializando usuarios de prueba...');
      await authService.initializeTestUsers();
    }
    
    // 3. Iniciar servidor
    app.listen(PORT, () => {
      console.log(`✅ Gateway corriendo en: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Login test: POST http://localhost:${PORT}/api/auth/login`);
      console.log(`📦 Stock test: POST http://localhost:${PORT}/api/v1/industrial/stock`);
      console.log('=' .repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

// ========== MANEJO DE SHUTDOWN ==========
async function shutdown(signal) {
  console.log(`\n🛑 Recibido ${signal}, cerrando servidor...`);
  
  try {
    // Cerrar conexiones a bases de datos
    await disconnectDatabases();
    console.log('✅ Conexiones cerradas correctamente');
    
    // Salir
    setTimeout(() => {
      console.log('👋 Servidor detenido');
      process.exit(0);
    }, 1000);
  } catch (error) {
    console.error('❌ Error durante shutdown:', error);
    process.exit(1);
  }
}

// Capturar señales de terminación
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Error no capturado:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rechazada no manejada:', reason);
  shutdown('unhandledRejection');
});

// Iniciar servidor
startServer();

module.exports = app; // Para testing