const Order = require('../models/Order');
const Product = require('../models/Product');
const redisService = require('./redisService');
const logger = require('../utils/logger');

class OrderService {
  async createOrder(userId, orderData, reservationId) {
    try {
      const reservation = await redisService.releaseReservation(reservationId);
      
      if (!reservation.success) {
        throw new Error('Invalid or expired reservation');
      }

      const product = await Product.findById(reservation.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const orderItems = [{
        product: reservation.productId,
        sku: product.sku,
        quantity: reservation.quantity,
        price: product.price,
        subtotal: product.price * reservation.quantity
      }];

      const order = new Order({
        user: userId,
        items: orderItems,
        totalAmount: orderItems[0].subtotal,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress || orderData.shippingAddress,
        reservationId: reservationId,
        notes: orderData.notes
      });

      await order.save();

      await Product.findByIdAndUpdate(reservation.productId, {
        $inc: { 
          reservedStock: -reservation.quantity,
          soldStock: reservation.quantity
        }
      });

      logger.info(`Order created: ${order.orderNumber} for user ${userId}`);
      
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  async createBatchOrder(userId, orderData, batchReservationId) {
    try {
      const userReservations = await redisService.getUserReservations(userId);
      const batchReservations = userReservations.filter(res => 
        res.batchReservationId === batchReservationId
      );

      if (batchReservations.length === 0) {
        throw new Error('No valid reservations found for this batch');
      }

      const productIds = batchReservations.map(res => res.productId);
      const products = await Product.find({ '_id': { $in: productIds } });
      
      const productMap = products.reduce((map, product) => {
        map[product._id.toString()] = product;
        return map;
      }, {});

      const orderItems = [];
      let totalAmount = 0;

      for (const reservation of batchReservations) {
        const product = productMap[reservation.productId];
        if (!product) {
          throw new Error(`Product ${reservation.productId} not found`);
        }

        const subtotal = product.price * reservation.quantity;
        orderItems.push({
          product: reservation.productId,
          sku: product.sku,
          quantity: reservation.quantity,
          price: product.price,
          subtotal: subtotal
        });
        totalAmount += subtotal;

        await redisService.confirmReservation(reservation.reservationId);
      }

      const order = new Order({
        user: userId,
        items: orderItems,
        totalAmount: totalAmount,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress || orderData.shippingAddress,
        reservationId: batchReservationId,
        notes: orderData.notes
      });

      await order.save();

      for (const reservation of batchReservations) {
        await Product.findByIdAndUpdate(reservation.productId, {
          $inc: { 
            reservedStock: -reservation.quantity,
            soldStock: reservation.quantity
          }
        });
      }

      logger.info(`Batch order created: ${order.orderNumber} for user ${userId}`);
      
      return order;
    } catch (error) {
      logger.error('Error creating batch order:', error);
      throw error;
    }
  }

  async getOrderById(orderId, userId = null) {
    try {
      const query = { _id: orderId };
      if (userId) {
        query.user = userId;
      }

      const order = await Order.findOne(query).populate('user', 'username email fullName');
      
      if (!order) {
        throw new Error('Order not found');
      }

      await order.populate('items.product', 'sku name price images');

      return order;
    } catch (error) {
      logger.error('Error getting order:', error);
      throw error;
    }
  }

  async getOrdersByUserId(userId, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'orderDate', sortOrder = 'desc' } = pagination;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const skip = (page - 1) * limit;

      const orders = await Order.find({ user: userId })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'sku name price images');

      const total = await Order.countDocuments({ user: userId });

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  async getAllOrders(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'orderDate', sortOrder = 'desc' } = pagination;
      const { status, paymentStatus, startDate, endDate } = filters;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }

      if (startDate || endDate) {
        query.orderDate = {};
        if (startDate) query.orderDate.$gte = new Date(startDate);
        if (endDate) query.orderDate.$lte = new Date(endDate);
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const skip = (page - 1) * limit;

      const orders = await Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email fullName')
        .populate('items.product', 'sku name price images');

      const total = await Order.countDocuments(query);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all orders:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status, paymentStatus = null) {
    try {
      const updateData = { status };
      
      if (status === 'confirmed') {
        updateData.confirmedDate = new Date();
      } else if (status === 'shipped') {
        updateData.shippedDate = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredDate = new Date();
      }

      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
      }

      const order = await Order.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true, runValidators: true }
      ).populate('user', 'username email fullName');

      if (!order) {
        throw new Error('Order not found');
      }

      logger.info(`Order status updated: ${orderId} to ${status}`);
      
      return order;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  async cancelOrder(orderId, userId = null) {
    try {
      const order = await this.getOrderById(orderId, userId);
      
      if (!order.canCancel) {
        throw new Error('Order cannot be cancelled in current status');
      }

      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { 
            soldStock: -item.quantity,
            availableStock: item.quantity
          }
        });
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { 
          status: 'cancelled',
          notes: (order.notes || '') + '\nOrder cancelled: ' + new Date().toISOString()
        },
        { new: true }
      ).populate('user', 'username email fullName');

      logger.info(`Order cancelled: ${orderId}`);
      
      return updatedOrder;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  async getOrderStats(startDate = null, endDate = null) {
    try {
      const matchStage = {};
      
      if (startDate || endDate) {
        matchStage.orderDate = {};
        if (startDate) matchStage.orderDate.$gte = new Date(startDate);
        if (endDate) matchStage.orderDate.$lte = new Date(endDate);
      }

      const stats = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            ordersByStatus: {
              $push: '$status'
            },
            ordersByPaymentStatus: {
              $push: '$paymentStatus'
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: [],
        ordersByPaymentStatus: []
      };

      const statusCounts = {};
      result.ordersByStatus.forEach(status => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const paymentStatusCounts = {};
      result.ordersByPaymentStatus.forEach(status => {
        paymentStatusCounts[status] = (paymentStatusCounts[status] || 0) + 1;
      });

      return {
        totalOrders: result.totalOrders,
        totalRevenue: result.totalRevenue,
        averageOrderValue: result.averageOrderValue,
        ordersByStatus: statusCounts,
        ordersByPaymentStatus: paymentStatusCounts
      };
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw error;
    }
  }
}

module.exports = new OrderService();
