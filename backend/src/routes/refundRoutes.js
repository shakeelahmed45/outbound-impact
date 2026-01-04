const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  checkRefundEligibility,
  requestRefund,
  getRefundStatus,
} = require('../controllers/refundController');

/**
 * ðŸ”„ REFUND ROUTES - WITH ACCOUNT DELETION
 * All routes require authentication
 */

// Check if user is eligible for refund
router.get('/check-eligibility', authenticateToken, checkRefundEligibility);

// Request a refund (will delete account)
router.post('/request', authenticateToken, requestRefund);

// Get refund status
router.get('/status', authenticateToken, getRefundStatus);

module.exports = router;