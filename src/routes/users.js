const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { validateUserUpdate } = require('../validators/userValidator');

const router = express.Router();

router.get('/', authMiddleware.authenticate, userController.getAllUsers);
router.get('/:id', authMiddleware.authenticate, userController.getUserById);
router.put('/:id', authMiddleware.authenticate, validateUserUpdate, userController.updateUser);
router.delete('/:id', authMiddleware.authenticate, userController.deactivateUser);

module.exports = router;
