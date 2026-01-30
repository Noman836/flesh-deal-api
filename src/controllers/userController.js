const userService = require('../services/userService');
const logger = require('../utils/logger');

class UserController {
  async register(req, res, next) {
    try {
      const user = await userService.createUser(req.body);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in register controller:', error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await userService.authenticateUser(email, password);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Error in login controller:', error);
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await userService.getUserById(userId);
      
      res.json({
        success: true,
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in getProfile controller:', error);
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.userId;
      const user = await userService.updateUser(userId, req.body);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in updateProfile controller:', error);
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      const result = await userService.changePassword(userId, currentPassword, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in changePassword controller:', error);
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const filters = {
        role: req.query.role,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };
      
      const result = await userService.getAllUsers(filters, pagination);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in getAllUsers controller:', error);
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      res.json({
        success: true,
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in getUserById controller:', error);
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.updateUser(id, req.body);
      
      res.json({
        success: true,
        message: 'User updated successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in updateUser controller:', error);
      next(error);
    }
  }

  async deactivateUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.deactivateUser(id);
      
      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: user.toJSON()
      });
    } catch (error) {
      logger.error('Error in deactivateUser controller:', error);
      next(error);
    }
  }
}

module.exports = new UserController();
