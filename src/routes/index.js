const express = require('express');
const authRoutes = require('./auth');
const productRoutes = require('./products');
const orderRoutes = require('./orders');
const userRoutes = require('./users');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Flash Deal API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
