const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');

// ✅ Toggle auto-renewal (set cancel_at_period_end)
router.post('/toggle-renewal', authMiddleware, subscriptionController.toggleAutoRenewal);

// ✅ Cancel subscription with 7-day refund logic
router.post('/cancel', authMiddleware, subscriptionController.cancelSubscription);

// ✅ Reactivate canceled subscription
router.post('/reactivate', authMiddleware, subscriptionController.reactivateSubscription);

module.exports = router;