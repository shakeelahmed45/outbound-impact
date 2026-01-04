const express = require('express');
const router = express.Router();

console.log('🔍 [ROUTES] Loading refundRoutes.js...');

const { authenticateToken } = require('../middleware/auth');
console.log('✅ [ROUTES] Auth middleware loaded');

// Import refund controller functions
let refundController;
try {
  refundController = require('../controllers/refundController');
  console.log('✅ [ROUTES] Refund controller loaded successfully');
  console.log('✅ [ROUTES] Available functions:', Object.keys(refundController));
} catch (error) {
  console.error('❌ [ROUTES] Failed to load refund controller:', error.message);
  throw error;
}

const {
  checkRefundEligibility,
  requestRefund,
  getRefundStatus,
} = refundController;

// Verify functions are defined
if (!checkRefundEligibility || !requestRefund || !getRefundStatus) {
  console.error('❌ [ROUTES] Refund controller functions are undefined!');
  console.error('   checkRefundEligibility:', typeof checkRefundEligibility);
  console.error('   requestRefund:', typeof requestRefund);
  console.error('   getRefundStatus:', typeof getRefundStatus);
  throw new Error('Refund controller functions are not properly exported');
}

console.log('✅ [ROUTES] All refund functions verified');

/**
 * 🔄 REFUND ROUTES - WITH ACCOUNT DELETION
 * All routes require authentication
 */

// Check if user is eligible for refund
router.get('/check-eligibility', authenticateToken, checkRefundEligibility);
console.log('✅ [ROUTES] GET /check-eligibility registered');

// Request a refund (will delete account)
router.post('/request', authenticateToken, requestRefund);
console.log('✅ [ROUTES] POST /request registered');

// Get refund status
router.get('/status', authenticateToken, getRefundStatus);
console.log('✅ [ROUTES] GET /status registered');

console.log('✅ [ROUTES] refundRoutes.js loaded completely!');

module.exports = router;