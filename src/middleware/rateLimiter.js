const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later'
      });
    }
  });
};

const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  'Too many requests from this IP, please try again after 15 minutes'
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many authentication attempts, please try again after 15 minutes'
);

const reservationLimiter = createRateLimiter(
  60 * 1000,
  10,
  'Too many reservation attempts, please try again after 1 minute'
);

module.exports = {
  generalLimiter,
  authLimiter,
  reservationLimiter
};
