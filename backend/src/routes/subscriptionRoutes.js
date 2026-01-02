const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');

// ✅ Toggle auto-renewal (set cancel_at_period_end)
router.post('/toggle-renewal', authMiddleware, subscriptionController.toggleAutoRenewal);

// ✅ Cancel subscription with prorated refund
router.post('/cancel', authMiddleware, subscriptionController.cancelSubscription);

module.exports = router;