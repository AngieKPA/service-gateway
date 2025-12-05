const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'gateway',
    timestamp: new Date().toISOString()
  });
});

// Login simulado
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    res.json({ 
      token: 'test-token-industrial-12345' 
    });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// Endpoint simulado (sin conectar al API todavía)
app.post('/api/v1/industrial/stock', (req, res) => {
  console.log('Consulta recibida:', req.body);
  
  // Respuesta simulada
  res.json({
    product_id: req.body.product_id || 'CASCO-001',
    product_name: 'Casco de Seguridad Tipo II',
    category: 'EPP',
    warehouse_id: req.body.warehouse_id || 'BOD-01',
    current_stock: 250,
    reserved_stock: 45,
    available_stock: 205,
    reorder_point: 50,
    safety_level: 'ALTO',
    certification: 'ANSI Z89.1',
    response_time_ms: 120.5,
    needs_reorder: false,
    note: 'Respuesta del gateway (API simulado)'
  });
});

// Alertas simuladas
app.get('/api/v1/industrial/alerts', (req, res) => {
  res.json([
    {
      product_id: 'RESP-001',
      product_name: 'Respirador N95',
      alert: 'STOCK BAJO CRÍTICO',
      current: 15,
      minimum: 30,
      urgency: 'ALTA',
      message: 'Solo quedan 15 cajas de respiradores'
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`✅ Gateway corriendo en puerto ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});