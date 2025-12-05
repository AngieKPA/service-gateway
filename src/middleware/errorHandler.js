function errorHandler(err, req, res, next) {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Errores de validación
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      message: err.message
    });
  }
  
  // Errores JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación es inválido'
    });
  }
  
  // Errores de timeout
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      error: 'Timeout del servicio',
      message: 'El servicio tardó demasiado en responder'
    });
  }
  
  // Error genérico
  return res.status(500).json({
    error: 'Error interno del servidor',
    message: 'Algo salió mal. Por favor, intente más tarde'
  });
}

module.exports = errorHandler;