const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/checkout', authController.createCheckout);
router.post('/complete-signup', authController.completeSignup);
router.post('/signin', authController.signIn);

// ✅ Password reset routes (public - no authentication required)
router.post('/forgot-password', authController.forgotPassword);
router.get('/verify-reset-token', authController.verifyResetToken);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/upgrade-plan', authMiddleware, authController.handleUpgradePlan);

module.exports = router;