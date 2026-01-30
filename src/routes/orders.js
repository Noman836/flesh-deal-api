const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');
const { validateOrderCreation, validateCheckout, validateOrderStatusUpdate } = require('../validators/orderValidator');

const router = express.Router();

router.post('/', authMiddleware.authenticate, validateOrderCreation, orderController.createOrder);
router.post('/checkout', authMiddleware.authenticate, validateCheckout, orderController.checkout);
router.post('/batch', authMiddleware.authenticate, validateOrderCreation, orderController.createBatchOrder);

router.get('/my', authMiddleware.authenticate, orderController.getUserOrders);
router.get('/stats', authMiddleware.authenticate, orderController.getOrderStats);
router.get('/', authMiddleware.authenticate, orderController.getAllOrders);
router.get('/:id', authMiddleware.authenticate, orderController.getOrder);

router.put('/:id/status', authMiddleware.authenticate, validateOrderStatusUpdate, orderController.updateOrderStatus);
router.delete('/:id', authMiddleware.authenticate, orderController.cancelOrder);

module.exports = router;
