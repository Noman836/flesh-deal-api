const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class RedisService {
  constructor() {
    this.RESERVATION_PREFIX = 'reservation:';
    this.STOCK_PREFIX = 'stock:';
    this.USER_RESERVATION_PREFIX = 'user_reservations:';
    this.PRODUCT_RESERVATION_PREFIX = 'product_reservations:';
  }

  async reserveStock(userId, productId, quantity, ttlSeconds = 600) {
    const client = redisClient.getClient();
    const reservationId = uuidv4();
    const stockKey = this.STOCK_PREFIX + productId;
    const reservationKey = this.RESERVATION_PREFIX + reservationId;
    const userReservationKey = this.USER_RESERVATION_PREFIX + userId;
    const productReservationKey = this.PRODUCT_RESERVATION_PREFIX + productId;

    try {
      const result = await client.multi()
        .get(stockKey)
        .exec();

      if (!result || result[0] === null) {
        throw new Error('Product stock not found in Redis');
      }

      const currentStock = parseInt(result[0]);
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`);
      }

      const reservationData = {
        userId,
        productId,
        quantity,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
      };

      await client.multi()
        .decrBy(stockKey, quantity)
        .setEx(reservationKey, ttlSeconds, JSON.stringify(reservationData))
        .sAdd(userReservationKey, reservationId)
        .expire(userReservationKey, ttlSeconds)
        .sAdd(productReservationKey, reservationId)
        .expire(productReservationKey, ttlSeconds)
        .exec();

      logger.info(`Stock reserved: ${quantity} units of product ${productId} for user ${userId}, reservation ID: ${reservationId}`);
      
      return {
        reservationId,
        quantity,
        expiresAt: reservationData.expiresAt
      };

    } catch (error) {
      logger.error('Error reserving stock:', error);
      throw error;
    }
  }

  async releaseReservation(reservationId) {
    const client = redisClient.getClient();
    const reservationKey = this.RESERVATION_PREFIX + reservationId;

    try {
      const reservationData = await client.get(reservationKey);
      
      if (!reservationData) {
        logger.warn(`Reservation ${reservationId} not found or expired`);
        return { success: false, message: 'Reservation not found or expired' };
      }

      const reservation = JSON.parse(reservationData);
      const stockKey = this.STOCK_PREFIX + reservation.productId;
      const userReservationKey = this.USER_RESERVATION_PREFIX + reservation.userId;
      const productReservationKey = this.PRODUCT_RESERVATION_PREFIX + reservation.productId;

      await client.multi()
        .incrBy(stockKey, reservation.quantity)
        .del(reservationKey)
        .sRem(userReservationKey, reservationId)
        .sRem(productReservationKey, reservationId)
        .exec();

      logger.info(`Reservation released: ${reservationId}, returned ${reservation.quantity} units to stock`);
      
      return {
        success: true,
        quantity: reservation.quantity,
        productId: reservation.productId
      };

    } catch (error) {
      logger.error('Error releasing reservation:', error);
      throw error;
    }
  }

  async confirmReservation(reservationId) {
    const client = redisClient.getClient();
    const reservationKey = this.RESERVATION_PREFIX + reservationId;

    try {
      const reservationData = await client.get(reservationKey);
      
      if (!reservationData) {
        throw new Error('Reservation not found or expired');
      }

      const reservation = JSON.parse(reservationData);
      const userReservationKey = this.USER_RESERVATION_PREFIX + reservation.userId;
      const productReservationKey = this.PRODUCT_RESERVATION_PREFIX + reservation.productId;

      await client.multi()
        .del(reservationKey)
        .sRem(userReservationKey, reservationId)
        .sRem(productReservationKey, reservationId)
        .exec();

      logger.info(`Reservation confirmed: ${reservationId}`);
      
      return {
        success: true,
        reservation: reservation
      };

    } catch (error) {
      logger.error('Error confirming reservation:', error);
      throw error;
    }
  }

  async getUserReservations(userId) {
    const client = redisClient.getClient();
    const userReservationKey = this.USER_RESERVATION_PREFIX + userId;

    try {
      const reservationIds = await client.sMembers(userReservationKey);
      const reservations = [];

      for (const reservationId of reservationIds) {
        const reservationData = await client.get(this.RESERVATION_PREFIX + reservationId);
        if (reservationData) {
          reservations.push({
            reservationId,
            ...JSON.parse(reservationData)
          });
        }
      }

      return reservations;

    } catch (error) {
      logger.error('Error getting user reservations:', error);
      throw error;
    }
  }

  async getProductReservations(productId) {
    const client = redisClient.getClient();
    const productReservationKey = this.PRODUCT_RESERVATION_PREFIX + productId;

    try {
      const reservationIds = await client.sMembers(productReservationKey);
      const reservations = [];

      for (const reservationId of reservationIds) {
        const reservationData = await client.get(this.RESERVATION_PREFIX + reservationId);
        if (reservationData) {
          reservations.push({
            reservationId,
            ...JSON.parse(reservationData)
          });
        }
      }

      return reservations;

    } catch (error) {
      logger.error('Error getting product reservations:', error);
      throw error;
    }
  }

  async initializeProductStock(productId, totalStock) {
    const client = redisClient.getClient();
    const stockKey = this.STOCK_PREFIX + productId;

    try {
      await client.set(stockKey, totalStock.toString());
      logger.info(`Initialized stock for product ${productId}: ${totalStock} units`);
      
      return { success: true, stock: totalStock };

    } catch (error) {
      logger.error('Error initializing product stock:', error);
      throw error;
    }
  }

  async getProductStock(productId) {
    const client = redisClient.getClient();
    const stockKey = this.STOCK_PREFIX + productId;

    try {
      const stock = await client.get(stockKey);
      return stock ? parseInt(stock) : 0;

    } catch (error) {
      logger.error('Error getting product stock:', error);
      throw error;
    }
  }

  async updateProductStock(productId, newStock) {
    const client = redisClient.getClient();
    const stockKey = this.STOCK_PREFIX + productId;

    try {
      await client.set(stockKey, newStock.toString());
      logger.info(`Updated stock for product ${productId}: ${newStock} units`);
      
      return { success: true, stock: newStock };

    } catch (error) {
      logger.error('Error updating product stock:', error);
      throw error;
    }
  }

  async reserveMultipleItems(userId, items, ttlSeconds = 600) {
    const client = redisClient.getClient();
    const reservationId = uuidv4();
    const reservations = [];

    try {
      for (const item of items) {
        const stockKey = this.STOCK_PREFIX + item.productId;
        const currentStock = await client.get(stockKey);
        
        if (!currentStock) {
          throw new Error(`Product ${item.productId} stock not found in Redis`);
        }

        const availableStock = parseInt(currentStock);
        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}. Available: ${availableStock}, Requested: ${item.quantity}`);
        }
      }

      for (const item of items) {
        const stockKey = this.STOCK_PREFIX + item.productId;
        const reservationKey = this.RESERVATION_PREFIX + `${reservationId}_${item.productId}`;
        const userReservationKey = this.USER_RESERVATION_PREFIX + userId;
        const productReservationKey = this.PRODUCT_RESERVATION_PREFIX + item.productId;

        const reservationData = {
          userId,
          productId: item.productId,
          quantity: item.quantity,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
          batchReservationId: reservationId
        };

        await client.multi()
          .decrBy(stockKey, item.quantity)
          .setEx(reservationKey, ttlSeconds, JSON.stringify(reservationData))
          .sAdd(userReservationKey, `${reservationId}_${item.productId}`)
          .expire(userReservationKey, ttlSeconds)
          .sAdd(productReservationKey, `${reservationId}_${item.productId}`)
          .expire(productReservationKey, ttlSeconds)
          .exec();

        reservations.push({
          productId: item.productId,
          quantity: item.quantity,
          reservationId: `${reservationId}_${item.productId}`
        });
      }

      logger.info(`Batch stock reserved for user ${userId}, batch reservation ID: ${reservationId}`);
      
      return {
        batchReservationId: reservationId,
        reservations,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString()
      };

    } catch (error) {
      logger.error('Error in batch reservation:', error);
      
      for (const reservation of reservations) {
        try {
          await this.releaseReservation(reservation.reservationId);
        } catch (rollbackError) {
          logger.error('Error during reservation rollback:', rollbackError);
        }
      }
      
      throw error;
    }
  }
}

module.exports = new RedisService();
