const express = require('express');
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { validateProductCreation, validateProductUpdate, validateReservation, validateBatchReservation } = require('../validators/productValidator');

const router = express.Router();

router.post('/', authMiddleware.authenticate, validateProductCreation, productController.createProduct);
router.get('/', productController.getProducts);
router.get('/sku/:sku', productController.getProductBySku);
router.get('/:id', productController.getProduct);
router.get('/:id/stock-status', productController.getProductStockStatus);

router.put('/:id', authMiddleware.authenticate, validateProductUpdate, productController.updateProduct);
router.delete('/:id', authMiddleware.authenticate, productController.deleteProduct);

router.post('/reserve', authMiddleware.authenticate, validateReservation, productController.reserveProduct);
router.post('/reserve-batch', authMiddleware.authenticate, validateBatchReservation, productController.reserveMultipleProducts);
router.delete('/reservations/:reservationId', authMiddleware.authenticate, productController.cancelReservation);
router.get('/reservations/my', authMiddleware.authenticate, productController.getUserReservations);

module.exports = router;
