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

// ✅ Email verification routes (public - user can't sign in if not verified)
router.post('/send-verification', authController.sendVerificationCode);
router.post('/verify-email', authController.verifyEmailCode);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/upgrade-plan', authMiddleware, authController.handleUpgradePlan);

// ✅ Session status — lightweight heartbeat for SessionGuard
// Auth middleware checks: token validity, session timeout, suspension, maintenance
router.get('/session-status', authMiddleware, authController.getSessionStatus);

module.exports = router;