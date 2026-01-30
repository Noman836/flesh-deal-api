const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(err);

  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    
    return res.status(400).json({
      success: false,
      message,
      errors
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field} '${value}' already exists`;
    
    return res.status(400).json({
      success: false,
      message,
      field
    });
  }

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    
    return res.status(404).json({
      success: false,
      message
    });
  }

  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    
    return res.status(401).json({
      success: false,
      message
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    
    return res.status(401).json({
      success: false,
      message
    });
  }

  if (err.message.includes('Insufficient stock')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err.message.includes('not found') || err.message.includes('not active')) {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }

  if (err.message.includes('Invalid credentials') || err.message.includes('unauthorized')) {
    return res.status(401).json({
      success: false,
      message: err.message
    });
  }

  if (err.message.includes('forbidden') || err.message.includes('access required')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  if (err.message.includes('already exists')) {
    return res.status(409).json({
      success: false,
      message: err.message
    });
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
