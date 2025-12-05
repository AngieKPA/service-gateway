// Abstrae las operaciones de Redis en metodos simples... maneja TTL  y proporciona estadisticas de uso en cache 
// si redis falla  maneja los errores sin romper la app
const { getRedisClient } = require('../config/database');

class CacheService {
  constructor() {
    this.redisClient = getRedisClient();
  }
  
  // Obtener datos del cache
  async get(key) {
    try {
      const data = await this.redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error obteniendo del cache:', error);
      return null;
    }
  }
  
  // Almacenar datos en cache con TTL (Time To Live)
  async set(key, value, ttlSeconds = 30) {
    try {
      await this.redisClient.setEx(
        key,
        ttlSeconds,
        JSON.stringify(value)
      );
      return true;
    } catch (error) {
      console.error('Error almacenando en cache:', error);
      return false;
    }
  }
  
  // Eliminar datos del cache
  async delete(key) {
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Error eliminando del cache:', error);
      return false;
    }
  }
  
  // Eliminar múltiples claves (patrón)
  async deletePattern(pattern) {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Error eliminando patrón del cache:', error);
      return false;
    }
  }
  
  // Obtener estadísticas del cache
  async getStats() {
    try {
      const info = await this.redisClient.info();
      const keys = await this.redisClient.keys('*');
      
      return {
        totalKeys: keys.length,
        stockKeys: keys.filter(k => k.includes('stock')).length,
        connected: true
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = new CacheService();