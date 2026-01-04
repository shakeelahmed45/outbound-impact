const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Import refund controller
const refundController = require('../controllers/refundController');

/**
 * EXISTING USER ROUTES
 */
router.post('/upload-photo', authMiddleware, userController.uploadProfilePhoto);
router.put('/profile', authMiddleware, userController.updateProfile);
router.delete('/account', authMiddleware, userController.deleteAccount);
router.put('/change-email', authMiddleware, userController.changeEmail);

/**
 * ðŸ”„ REFUND ROUTES (7-DAY POLICY)
 * Added to userRoutes to avoid timing issues
 */
router.get('/refund/check-eligibility', authMiddleware, refundController.checkRefundEligibility);
router.post('/refund/request', authMiddleware, refundController.requestRefund);
router.get('/refund/status', authMiddleware, refundController.getRefundStatus);

module.exports = router;