const userService = require('../services/userService');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = userService.verifyToken(token);
    
    const user = await userService.getUserById(decoded.userId);
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    req.user = {
      userId: user._id,
      email: user.email
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = {
  authenticate
};
