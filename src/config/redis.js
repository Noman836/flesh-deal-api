const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Prefer an explicit URL if provided (e.g. redis://:password@host:6379)
      if (process.env.REDIS_URL) {
        this.client = redis.createClient({ url: process.env.REDIS_URL });
      } else {
        const socket = {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
        };

        const opts = { socket };
        if (process.env.REDIS_PASSWORD) opts.password = process.env.REDIS_PASSWORD;
        if (process.env.REDIS_DB) opts.database = Number(process.env.REDIS_DB);

        this.client = redis.createClient(opts);
      }

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Ready');
      });

      this.client.on('end', () => {
        logger.warn('Redis Client Connection Ended');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // If Redis is not required for local development, allow app to start
      if (process.env.REDIS_REQUIRED && process.env.REDIS_REQUIRED.toLowerCase() === 'false') {
        logger.warn('Continuing without Redis because REDIS_REQUIRED=false');
        return;
      }
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  getClient() {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  isReady() {
    return this.isConnected;
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
