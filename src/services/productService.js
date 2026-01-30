const Product = require('../models/Product');
const redisService = require('./redisService');
const logger = require('../utils/logger');

class ProductService {
  async createProduct(productData) {
    try {
      const product = new Product(productData);
      await product.save();

      await redisService.initializeProductStock(product._id.toString(), product.totalStock);

      logger.info(`Product created: ${product._id}, SKU: ${product.sku}`);
      
      return product;
    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  async getProductById(productId) {
    try {
      const product = await Product.findById(productId).where({ isActive: true });
      
      if (!product) {
        throw new Error('Product not found');
      }

      const redisStock = await redisService.getProductStock(productId);
      const reservations = await redisService.getProductReservations(productId);
      
      const totalReserved = reservations.reduce((sum, res) => sum + res.quantity, 0);

      return {
        ...product.toObject(),
        currentRedisStock: redisStock,
        currentReservedStock: totalReserved,
        availableStock: redisStock,
        stockStatus: redisStock === 0 ? 'OUT_OF_STOCK' : 
                    redisStock < product.totalStock * 0.1 ? 'LOW_STOCK' : 'AVAILABLE'
      };
    } catch (error) {
      logger.error('Error getting product:', error);
      throw error;
    }
  }

  async getProductBySku(sku) {
    try {
      const product = await Product.findOne({ sku, isActive: true });
      
      if (!product) {
        throw new Error('Product not found');
      }

      return await this.getProductById(product._id);
    } catch (error) {
      logger.error('Error getting product by SKU:', error);
      throw error;
    }
  }

  async getAllProducts(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const { category, minPrice, maxPrice, inStock } = filters;

      const query = { isActive: true };

      if (category) {
        query.category = category;
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        query.price = {};
        if (minPrice !== undefined) query.price.$gte = minPrice;
        if (maxPrice !== undefined) query.price.$lte = maxPrice;
      }

      if (inStock === true) {
        query.availableStock = { $gt: 0 };
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await Product.countDocuments(query);

      const productsWithStock = await Promise.all(
        products.map(async (product) => {
          const redisStock = await redisService.getProductStock(product._id.toString());
          const reservations = await redisService.getProductReservations(product._id.toString());
          const totalReserved = reservations.reduce((sum, res) => sum + res.quantity, 0);

          return {
            ...product.toObject(),
            currentRedisStock: redisStock,
            currentReservedStock: totalReserved,
            availableStock: redisStock,
            stockStatus: redisStock === 0 ? 'OUT_OF_STOCK' : 
                        redisStock < product.totalStock * 0.1 ? 'LOW_STOCK' : 'AVAILABLE'
          };
        })
      );

      return {
        products: productsWithStock,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting products:', error);
      throw error;
    }
  }

  async updateProduct(productId, updateData) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!product) {
        throw new Error('Product not found');
      }

      if (updateData.totalStock !== undefined) {
        await redisService.updateProductStock(productId, product.availableStock);
      }

      logger.info(`Product updated: ${productId}`);
      
      return product;
    } catch (error) {
      logger.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(productId) {
    try {
      const product = await Product.findByIdAndUpdate(
        productId,
        { isActive: false },
        { new: true }
      );

      if (!product) {
        throw new Error('Product not found');
      }

      logger.info(`Product deactivated: ${productId}`);
      
      return product;
    } catch (error) {
      logger.error('Error deleting product:', error);
      throw error;
    }
  }

  async getProductStockStatus(productId) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error('Product not found');
      }

      const redisStock = await redisService.getProductStock(productId);
      const reservations = await redisService.getProductReservations(productId);
      
      const totalReserved = reservations.reduce((sum, res) => sum + res.quantity, 0);

      return {
        productId: product._id,
        sku: product.sku,
        name: product.name,
        totalStock: product.totalStock,
        soldStock: product.soldStock,
        reservedStock: totalReserved,
        availableStock: redisStock,
        stockStatus: redisStock === 0 ? 'OUT_OF_STOCK' : 
                    redisStock < product.totalStock * 0.1 ? 'LOW_STOCK' : 'AVAILABLE',
        reservationPercentage: product.totalStock > 0 ? 
          ((totalReserved / product.totalStock) * 100).toFixed(2) : 0,
        reservations: reservations.map(res => ({
          reservationId: res.reservationId,
          userId: res.userId,
          quantity: res.quantity,
          createdAt: res.createdAt,
          expiresAt: res.expiresAt
        }))
      };
    } catch (error) {
      logger.error('Error getting product stock status:', error);
      throw error;
    }
  }

  async reserveProduct(userId, productId, quantity) {
    try {
      const product = await Product.findById(productId);
      
      if (!product || !product.isActive) {
        throw new Error('Product not found or inactive');
      }

      const now = new Date();
      if (now < product.flashDealSettings.startTime || now > product.flashDealSettings.endTime) {
        throw new Error('Flash deal is not active');
      }

      const reservation = await redisService.reserveStock(
        userId, 
        productId, 
        quantity, 
        product.flashDealSettings.maxReservationTime
      );

      await Product.findByIdAndUpdate(productId, {
        $inc: { reservedStock: quantity }
      });

      logger.info(`Product reserved: ${productId} for user ${userId}, quantity: ${quantity}`);
      
      return {
        product: {
          id: product._id,
          sku: product.sku,
          name: product.name,
          price: product.price
        },
        reservation
      };
    } catch (error) {
      logger.error('Error reserving product:', error);
      throw error;
    }
  }

  async reserveMultipleProducts(userId, items) {
    try {
      const products = await Product.find({
        '_id': { $in: items.map(item => item.productId) },
        isActive: true
      });

      if (products.length !== items.length) {
        throw new Error('One or more products not found or inactive');
      }

      const now = new Date();
      for (const product of products) {
        if (now < product.flashDealSettings.startTime || now > product.flashDealSettings.endTime) {
          throw new Error(`Flash deal for product ${product.sku} is not active`);
        }
      }

      const reservation = await redisService.reserveMultipleItems(userId, items);

      for (const item of items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { reservedStock: item.quantity }
        });
      }

      logger.info(`Multiple products reserved for user ${userId}`);
      
      return {
        products: products.map(product => ({
          id: product._id,
          sku: product.sku,
          name: product.name,
          price: product.price
        })),
        reservation
      };
    } catch (error) {
      logger.error('Error reserving multiple products:', error);
      throw error;
    }
  }

  async cancelReservation(userId, reservationId) {
    try {
      const result = await redisService.releaseReservation(reservationId);
      
      if (result.success) {
        await Product.findByIdAndUpdate(result.productId, {
          $inc: { reservedStock: -result.quantity }
        });

        logger.info(`Reservation cancelled: ${reservationId} by user ${userId}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Error cancelling reservation:', error);
      throw error;
    }
  }

  async getUserReservations(userId) {
    try {
      const reservations = await redisService.getUserReservations(userId);
      
      const productIds = [...new Set(reservations.map(res => res.productId))];
      const products = await Product.find({ '_id': { $in: productIds } });
      
      const productMap = products.reduce((map, product) => {
        map[product._id.toString()] = product;
        return map;
      }, {});

      const reservationsWithProducts = reservations.map(reservation => ({
        ...reservation,
        product: productMap[reservation.productId] ? {
          id: productMap[reservation.productId]._id,
          sku: productMap[reservation.productId].sku,
          name: productMap[reservation.productId].name,
          price: productMap[reservation.productId].price
        } : null
      }));

      return reservationsWithProducts;
    } catch (error) {
      logger.error('Error getting user reservations:', error);
      throw error;
    }
  }
}

module.exports = new ProductService();
