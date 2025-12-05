// get stock consulta  con cache  fell back y auditoria... getfallback  datos de respaldo por si el serv falla... 
const inventoryProxy = require('../services/inventory.proxy');
const cacheService = require('../services/cache.service');
const auditService = require('../services/audit.service');

class StockController {
  // Consultar stock de un producto
  async getStock(req, res) {
    const startTime = Date.now();
    const { product_id, warehouse_id } = req.body;
    const userId = req.user?.username || 'anonymous';
    const clientIP = req.ip;
    
    // Validación
    if (!product_id) {
      return res.status(400).json({
        error: 'Producto requerido',
        message: 'El parámetro product_id es obligatorio'
      });
    }
    
    try {
      // 1. Verificar cache primero
      const cacheKey = `stock:${product_id}:${warehouse_id || 'all'}`;
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        const responseTime = Date.now() - startTime;
        
        // Auditoría
        await auditService.logStockQuery(
          userId, 
          product_id, 
          clientIP, 
          true, 
          responseTime
        );
        
        console.log(`⚡ Cache HIT para ${product_id} (${responseTime}ms)`);
        
        return res.json({
          ...cachedData,
          metadata: {
            source: 'cache',
            responseTime: `${responseTime}ms`,
            cached: true,
            meetsASR: responseTime < 3000
          }
        });
      }
      
      console.log(`🔄 Cache MISS para ${product_id}, consultando Inventory...`);
      
      // 2. Consultar servicio de inventario
      const token = req.headers.authorization;
      const stockResult = await inventoryProxy.getStock(
        product_id, 
        warehouse_id, 
        token
      );
      
      if (!stockResult.success) {
        // Manejar error del servicio de inventario
        if (stockResult.code === 'SERVICE_UNAVAILABLE') {
          // Respuesta de fallback
          return res.status(503).json({
            error: 'Servicio temporalmente no disponible',
            message: 'El sistema de inventario no está disponible',
            fallbackData: this.getFallbackStockData(product_id, warehouse_id),
            metadata: {
              source: 'fallback',
              responseTime: `${Date.now() - startTime}ms`
            }
          });
        }
        
        // Otros errores
        return res.status(500).json({
          error: 'Error consultando inventario',
          message: stockResult.error
        });
      }
      
      const responseTime = Date.now() - startTime;
      
      // 3. Almacenar en cache (30 segundos TTL)
      await cacheService.set(cacheKey, stockResult.data, 30);
      
      // 4. Auditoría
      await auditService.logStockQuery(
        userId, 
        product_id, 
        clientIP, 
        false, 
        responseTime
      );
      
      // 5. Verificar ASR de latencia
      let asrStatus = 'meets';
      if (responseTime > 3000) {
        asrStatus = 'violates';
        console.warn(`⚠️  ASR Violado: Consulta tomó ${responseTime}ms (límite: 3000ms)`);
      } else if (responseTime > 2000) {
        asrStatus = 'warning';
        console.log(`⚠️  ASR Advertencia: Consulta tomó ${responseTime}ms`);
      }
      
      // 6. Responder
      res.json({
        ...stockResult.data,
        metadata: {
          source: 'database',
          responseTime: `${responseTime}ms`,
          cached: false,
          meetsASR: responseTime < 3000,
          asrStatus,
          gatewayProcessingTime: responseTime
        }
      });
      
    } catch (error) {
      console.error('Error en consulta de stock:', error);
      
      // Respuesta de error con fallback
      const responseTime = Date.now() - startTime;
      
      res.status(500).json({
        error: 'Error interno del servidor',
        message: 'No se pudo procesar la consulta',
        fallbackData: this.getFallbackStockData(product_id, warehouse_id),
        metadata: {
          source: 'error_fallback',
          responseTime: `${responseTime}ms`
        }
      });
    }
  }
  
  // Datos de fallback cuando el servicio no está disponible
  getFallbackStockData(productId, warehouseId) {
    const mockProducts = {
      'CASCO-001': {
        product_id: 'CASCO-001',
        product_name: 'Casco de Seguridad Tipo II',
        category: 'EPP',
        warehouse_id: warehouseId || 'BOD-01',
        current_stock: 0,
        reserved_stock: 0,
        available_stock: 0,
        reorder_point: 50,
        safety_level: 'DESCONOCIDO',
        certification: 'ANSI Z89.1',
        note: 'Datos de respaldo - Servicio no disponible'
      },
      'RESP-001': {
        product_id: 'RESP-001',
        product_name: 'Respirador N95',
        category: 'EPP',
        warehouse_id: warehouseId || 'BOD-01',
        current_stock: 0,
        reserved_stock: 0,
        available_stock: 0,
        reorder_point: 200,
        safety_level: 'DESCONOCIDO',
        certification: 'NIOSH 42CFR84',
        note: 'Datos de respaldo - Servicio no disponible'
      }
    };
    
    return mockProducts[productId] || {
      product_id: productId,
      product_name: 'Producto no identificado',
      category: 'DESCONOCIDO',
      warehouse_id: warehouseId || 'BOD-01',
      current_stock: 0,
      note: 'Servicio no disponible - Usando datos de respaldo'
    };
  }
  
  // Endpoint de administración de cache (solo admin)
  async manageCache(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Permiso denegado',
        message: 'Se requiere rol de administrador'
      });
    }
    
    const { action, key } = req.body;
    
    try {
      switch (action) {
        case 'clear':
          if (key) {
            await cacheService.delete(key);
            return res.json({
              success: true,
              message: `Cache key "${key}" eliminada`
            });
          } else {
            // Eliminar todas las keys de stock
            await cacheService.deletePattern('stock:*');
            return res.json({
              success: true,
              message: 'Cache de stock limpiado'
            });
          }
          
        case 'stats':
          const stats = await cacheService.getStats();
          return res.json({
            success: true,
            stats
          });
          
        case 'get':
          if (!key) {
            return res.status(400).json({
              error: 'Key requerida',
              message: 'Se requiere el parámetro "key"'
            });
          }
          const data = await cacheService.get(key);
          return res.json({
            success: true,
            data,
            exists: data !== null
          });
          
        default:
          return res.status(400).json({
            error: 'Acción no válida',
            message: 'Acciones válidas: clear, stats, get'
          });
      }
    } catch (error) {
      console.error('Error administrando cache:', error);
      res.status(500).json({
        error: 'Error interno',
        message: 'No se pudo procesar la solicitud'
      });
    }
  }
}

module.exports = new StockController();