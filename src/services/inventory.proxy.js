// proxi http  para comunicarse con service inventory 
const axios = require('axios');
const config = require('../config');

class InventoryProxy {
  constructor() {
    // Crear instancia de axios con configuración base
    this.client = axios.create({
      baseURL: config.services.inventory,
      timeout: 5000, // 5 segundos timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Interceptor para logging
    this.client.interceptors.request.use(
      (requestConfig) => {
        console.log(`➡️  Enviando a Inventory: ${requestConfig.method} ${requestConfig.url}`);
        return requestConfig;
      },
      (error) => {
        console.error('❌ Error en request a Inventory:', error.message);
        return Promise.reject(error);
      }
    );
    
    // Interceptor para respuestas
    this.client.interceptors.response.use(
      (response) => {
        console.log(`⬅️  Respuesta de Inventory: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ Error en respuesta de Inventory:', error.message);
        return Promise.reject(error);
      }
    );
  }
  
  // Consultar stock
  async getStock(productId, warehouseId, authToken) {
    try {
      const response = await this.client.post('/api/v1/stock', {
        product_id: productId,
        warehouse_id: warehouseId
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Health check del servicio de inventario
  async healthCheck() {
    try {
      const response = await this.client.get('/health', { timeout: 3000 });
      return {
        healthy: response.status === 200,
        status: response.data?.status || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  // Manejo de errores
  handleError(error) {
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Servicio de inventario no disponible',
        code: 'SERVICE_UNAVAILABLE'
      };
    }
    
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Timeout del servicio de inventario',
        code: 'SERVICE_TIMEOUT'
      };
    }
    
    if (error.response) {
      // El servicio respondió con un error HTTP
      return {
        success: false,
        error: error.response.data?.error || 'Error del servicio',
        code: `HTTP_${error.response.status}`,
        statusCode: error.response.status,
        data: error.response.data
      };
    }
    
    // Error genérico
    return {
      success: false,
      error: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }
}

module.exports = new InventoryProxy();