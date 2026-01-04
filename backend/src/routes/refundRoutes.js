const express = require('express');
const router = express.Router();

console.log('🔍 [ROUTES] Loading refundRoutes.js...');

const { authenticateToken } = require('../middleware/auth');
console.log('✅ [ROUTES] Auth middleware loaded');

// Import refund controller
const refundController = require('../controllers/refundController');
console.log('✅ [ROUTES] Refund controller loaded');
console.log('✅ [ROUTES] Available functions:', Object.keys(refundController));

/**
 * 🔄 REFUND ROUTES - WITH ACCOUNT DELETION
 * All routes require authentication
 */

// Check if user is eligible for refund
router.get('/check-eligibility', authenticateToken, refundController.checkRefundEligibility);
console.log('✅ [ROUTES] GET /check-eligibility registered');

// Request a refund (will delete account)
router.post('/request', authenticateToken, refundController.requestRefund);
console.log('✅ [ROUTES] POST /request registered');

// Get refund status
router.get('/status', authenticateToken, refundController.getRefundStatus);
console.log('✅ [ROUTES] GET /status registered');

console.log('✅ [ROUTES] refundRoutes.js loaded completely!');

module.exports = router;