// login procesa el inicio de sesion, valida credenciales y devuelve el jwt, verify verifica el token 
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');

class AuthController {
  // Iniciar sesión
  async login(req, res) {
    const { username, password } = req.body;
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    // Validación básica
    if (!username || !password) {
      return res.status(400).json({
        error: 'Credenciales incompletas',
        message: 'Usuario y contraseña son requeridos'
      });
    }
    
    try {
      // Autenticar usuario
      const authResult = await authService.authenticate(username, password);
      
      if (!authResult.success) {
        // Registrar intento fallido
        await auditService.logLoginFailed(username, clientIP, authResult.error);
        
        return res.status(401).json({
          error: 'Autenticación fallida',
          message: 'Usuario o contraseña incorrectos'
        });
      }
      
      // Registrar login exitoso
      await auditService.logLoginSuccess(username, clientIP);
      
      // Responder con token y datos del usuario
      res.json({
        message: 'Autenticación exitosa',
        token: authResult.token,
        user: authResult.user,
        expiresIn: '1 hora'
      });
      
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        error: 'Error interno',
        message: 'No se pudo procesar la autenticación'
      });
    }
  }
  
  // Verificar token (para clientes que quieran validar)
  async verify(req, res) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'Token no proporcionado'
      });
    }
    
    try {
      const verification = await authService.verifyToken(token);
      res.json(verification);
    } catch (error) {
      res.status(500).json({
        valid: false,
        error: error.message
      });
    }
  }
  
  // Obtener información del usuario actual
  async me(req, res) {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }
    
    res.json({
      user: req.user
    });
  }
}

module.exports = new AuthController();