const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class UserService {
  async createUser(userData) {
    try {
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new Error('Email already exists');
        }
        if (existingUser.username === userData.username) {
          throw new Error('Username already exists');
        }
      }

      const user = new User(userData);
      await user.save();

      logger.info(`User created: ${user._id}, email: ${user.email}`);
      
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async authenticateUser(email, password) {
    try {
      const user = await User.findOne({ email, isActive: true });
      
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      user.lastLogin = new Date();
      await user.save();

      const token = this.generateToken(user._id);

      logger.info(`User authenticated: ${user._id}`);
      
      return {
        user: user.toJSON(),
        token
      };
    } catch (error) {
      logger.error('Error authenticating user:', error);
      throw error;
    }
  }

  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      if (updateData.email || updateData.username) {
        const existingUser = await User.findOne({
          _id: { $ne: userId },
          $or: [
            ...(updateData.email ? [{ email: updateData.email }] : []),
            ...(updateData.username ? [{ username: updateData.username }] : [])
          ]
        });

        if (existingUser) {
          if (existingUser.email === updateData.email) {
            throw new Error('Email already exists');
          }
          if (existingUser.username === updateData.username) {
            throw new Error('Username already exists');
          }
        }
      }

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`User updated: ${userId}`);
      
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deactivateUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`User deactivated: ${userId}`);
      
      return user;
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  async getAllUsers(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const { isActive } = filters;

      const query = {};

      if (isActive !== undefined) {
        query.isActive = isActive;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const skip = (page - 1) * limit;

      const users = await User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${userId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
