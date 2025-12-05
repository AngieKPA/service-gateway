// Formato estándar para respuestas exitosas
function success(data, message = 'Operación exitosa', metadata = {}) {
  return {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
}

// Formato estándar para respuestas de error
function error(message, errorCode = 'INTERNAL_ERROR', details = {}) {
  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
}

// Respuesta para validación fallida
function validationError(errors, message = 'Error de validación') {
  return error(message, 'VALIDATION_ERROR', { errors });
}

// Respuesta para recurso no encontrado
function notFound(resource, id) {
  return error(
    `${resource} no encontrado`,
    'NOT_FOUND',
    { resource, id }
  );
}

// Respuesta para acceso denegado
function forbidden(message = 'Acceso denegado') {
  return error(message, 'FORBIDDEN');
}

// Respuesta para no autenticado
function unauthorized(message = 'No autenticado') {
  return error(message, 'UNAUTHORIZED');
}

// Middleware para envolver respuestas en formato estándar
function responseWrapper(req, res, next) {
  // Guardar referencia original de res.json
  const originalJson = res.json;
  
  // Sobrescribir res.json para aplicar formato estándar
  res.json = function(data) {
    // Si ya es un error de Express, usar ese formato
    if (data.error && data.message) {
      return originalJson.call(this, data);
    }
    
    // Si es un objeto de error nuestro, usar ese
    if (data.success === false) {
      return originalJson.call(this, data);
    }
    
    // Si es una respuesta exitosa, envolver en formato estándar
    const wrappedData = success(data);
    return originalJson.call(this, wrappedData);
  };
  
  next();
}

module.exports = {
  success,
  error,
  validationError,
  notFound,
  forbidden,
  unauthorized,
  responseWrapper
};