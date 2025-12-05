//Es un patron singleton   que es una sola conexion para un servicio, funciones para obtener las conexiones con todos los modulos

const { MongoClient } = require('mongodb');
const redis = require('redis');

let mongoClient = null;
let mongoDb = null;
let redisClient = null;

async function connectMongo() {
  try {
    const config = require('./index');
    mongoClient = new MongoClient(config.database.mongo);
    await mongoClient.connect();
    mongoDb = mongoClient.db(config.database.mongoDb);
    console.log('✅ Conectado a MongoDB');
    return mongoDb;
  } catch (error) {
    console.error(' Error conectando a MongoDB:', error.message);
    throw error;
  }
}

async function connectRedis() {
  try {
    const config = require('./index');
    redisClient = redis.createClient({
      url: config.database.redis
    });
    
    redisClient.on('error', (err) => {
      console.error(' Error en Redis:', err);
    });
    
    await redisClient.connect();
    console.log(' Conectado a Redis');
    return redisClient;
  } catch (error) {
    console.error(' Error conectando a Redis:', error.message);
    throw error;
  }
}

async function connectDatabases() {
  console.log('🔗 Conectando a bases de datos...');
  await connectMongo();
  await connectRedis();
  console.log(' Todas las bases de datos conectadas');
}

async function disconnectDatabases() {
  if (mongoClient) {
    await mongoClient.close();
    console.log('🔌 MongoDB desconectado');
  }
  if (redisClient) {
    await redisClient.quit();
    console.log('🔌 Redis desconectado');
  }
}

function getMongoDb() {
  if (!mongoDb) {
    throw new Error('MongoDB no está conectado');
  }
  return mongoDb;
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis no está conectado');
  }
  return redisClient;
}

module.exports = {
  connectDatabases,
  disconnectDatabases,
  getMongoDb,
  getRedisClient,
  mongoClient,
  redisClient
};