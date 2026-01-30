const orderService = require('../services/orderService');
const logger = require('../utils/logger');

class OrderController {
  async createOrder(req, res, next) {
    try {
      const userId = req.user.userId;
      const { reservationId, ...orderData } = req.body;
      
      const order = await orderService.createOrder(userId, orderData, reservationId);
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error in createOrder controller:', error);
      next(error);
    }
  }

  async checkout(req, res, next) {
    try {
      const userId = req.user.userId;
      const { reservationId, shippingAddress, paymentMethod = 'credit_card' } = req.body;
      
      const order = await orderService.checkout(userId, reservationId, shippingAddress, paymentMethod);
      
      res.status(201).json({
        success: true,
        message: 'Checkout completed successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error in checkout controller:', error);
      next(error);
    }
  }

  async createBatchOrder(req, res, next) {
    try {
      const userId = req.user.userId;
      const { batchReservationId, ...orderData } = req.body;
      
      const order = await orderService.createBatchOrder(userId, orderData, batchReservationId);
      
      res.status(201).json({
        success: true,
        message: 'Batch order created successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error in createBatchOrder controller:', error);
      next(error);
    }
  }

  async getOrder(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const order = await orderService.getOrderById(id, userId);
      
      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Error in getOrder controller:', error);
      next(error);
    }
  }

  async getUserOrders(req, res, next) {
    try {
      const userId = req.user.userId;
      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'orderDate',
        sortOrder: req.query.sortOrder || 'desc'
      };
      
      const result = await orderService.getOrdersByUserId(userId, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getUserOrders controller:', error);
      next(error);
    }
  }

  async getAllOrders(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'orderDate',
        sortOrder: req.query.sortOrder || 'desc'
      };
      
      const result = await orderService.getAllOrders(filters, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getAllOrders controller:', error);
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, paymentStatus } = req.body;
      
      const order = await orderService.updateOrderStatus(id, status, paymentStatus);
      
      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error in updateOrderStatus controller:', error);
      next(error);
    }
  }

  async cancelOrder(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      
      const order = await orderService.cancelOrder(id, userId);
      
      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order
      });
    } catch (error) {
      logger.error('Error in cancelOrder controller:', error);
      next(error);
    }
  }

  async getOrderStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await orderService.getOrderStats(startDate, endDate);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getOrderStats controller:', error);
      next(error);
    }
  }
}

module.exports = new OrderController();
