const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/checkout', authController.createCheckout);
router.post('/complete-signup', authController.completeSignup);
router.post('/signin', authController.signIn);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;
