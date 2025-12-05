//maneja la lógica de autenticacion  ... usa bcryp para hashear y comparar contraseñas...
// Genera tokens JWT   con la informacion del usuario
// Verifica tokens para uso interno
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { getMongoDb } = require('../config/database');

class AuthService {
  constructor() {
    this.db = getMongoDb();
    this.usersCollection = this.db.collection('users');
  }
  
  // Inicializar usuarios de prueba
  async initializeTestUsers() {
    const testUsers = [
      {
        username: 'logistica',
        password: await bcrypt.hash('logistica2024', 10),
        role: 'user',
        name: 'Líder de Logística',
        department: 'Logística'
      },
      {
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        name: 'Administrador del Sistema',
        department: 'TI'
      },
      {
        username: 'visor',
        password: await bcrypt.hash('visorStock', 10),
        role: 'viewer',
        name: 'Visualizador de Stock',
        department: 'Operaciones'
      }
    ];
    
    for (const user of testUsers) {
      const existing = await this.usersCollection.findOne({ username: user.username });
      if (!existing) {
        await this.usersCollection.insertOne(user);
        console.log(`✅ Usuario creado: ${user.username}`);
      }
    }
  }
  
  // Autenticar usuario
  async authenticate(username, password) {
    try {
      // Buscar usuario en la base de datos
      const user = await this.usersCollection.findOne({ username });
      
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      // Verificar contraseña
      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        throw new Error('Contraseña incorrecta');
      }
      
      // Crear token JWT
      const token = jwt.sign(
        {
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn }
      );
      
      return {
        success: true,
        token,
        user: {
          username: user.username,
          role: user.role,
          name: user.name,
          department: user.department
        }
      };
      
    } catch (error) {
      console.error('Error en autenticación:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Verificar token (para validación interna)
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret);
      return { valid: true, user: decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new AuthService();