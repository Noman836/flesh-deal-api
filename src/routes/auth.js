const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { validateRegistration, validateLogin, validatePasswordChange } = require('../validators/userValidator');

const router = express.Router();

router.post('/register', validateRegistration, userController.register);
router.post('/login', validateLogin, userController.login);

router.get('/profile', authMiddleware.authenticate, userController.getProfile);
router.put('/profile', authMiddleware.authenticate, userController.updateProfile);
router.post('/change-password', authMiddleware.authenticate, validatePasswordChange, userController.changePassword);

module.exports = router;
