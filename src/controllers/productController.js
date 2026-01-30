const productService = require('../services/productService');
const logger = require('../utils/logger');

class ProductController {
  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      logger.error('Error in createProduct controller:', error);
      next(error);
    }
  }

  async getProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Error in getProduct controller:', error);
      next(error);
    }
  }

  async getProductBySku(req, res, next) {
    try {
      const { sku } = req.params;
      const product = await productService.getProductBySku(sku);
      
      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      logger.error('Error in getProductBySku controller:', error);
      next(error);
    }
  }

  async getProducts(req, res, next) {
    try {
      const filters = {
        category: req.query.category,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
        inStock: req.query.inStock === 'true'
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await productService.getAllProducts(filters, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getProducts controller:', error);
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(id, req.body);
      
      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      logger.error('Error in updateProduct controller:', error);
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.deleteProduct(id);
      
      res.json({
        success: true,
        message: 'Product deleted successfully',
        data: product
      });
    } catch (error) {
      logger.error('Error in deleteProduct controller:', error);
      next(error);
    }
  }

  async getProductStockStatus(req, res, next) {
    try {
      const { id } = req.params;
      const stockStatus = await productService.getProductStockStatus(id);
      
      res.json({
        success: true,
        data: stockStatus
      });
    } catch (error) {
      logger.error('Error in getProductStockStatus controller:', error);
      next(error);
    }
  }

  async reserveProduct(req, res, next) {
    try {
      const userId = req.user.userId;
      const { productId, quantity } = req.body;
      
      const result = await productService.reserveProduct(userId, productId, quantity);
      
      res.json({
        success: true,
        message: 'Product reserved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in reserveProduct controller:', error);
      next(error);
    }
  }

  async reserveMultipleProducts(req, res, next) {
    try {
      const userId = req.user.userId;
      const { items } = req.body;
      
      const result = await productService.reserveMultipleProducts(userId, items);
      
      res.json({
        success: true,
        message: 'Products reserved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in reserveMultipleProducts controller:', error);
      next(error);
    }
  }

  async cancelReservation(req, res, next) {
    try {
      const userId = req.user.userId;
      const { reservationId } = req.params;
      
      const result = await productService.cancelReservation(userId, reservationId);
      
      res.json({
        success: true,
        message: result.success ? 'Reservation cancelled successfully' : 'Reservation not found or expired',
        data: result
      });
    } catch (error) {
      logger.error('Error in cancelReservation controller:', error);
      next(error);
    }
  }

  async getUserReservations(req, res, next) {
    try {
      const userId = req.user.userId;
      const reservations = await productService.getUserReservations(userId);
      
      res.json({
        success: true,
        data: reservations
      });
    } catch (error) {
      logger.error('Error in getUserReservations controller:', error);
      next(error);
    }
  }
}

module.exports = new ProductController();
