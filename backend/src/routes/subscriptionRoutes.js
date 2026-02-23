const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');
const { resolveEffectiveUserId } = require('../middleware/resolveEffectiveUserId');

/**
 * SUBSCRIPTION / BILLING ROUTES
 * 
 * ✅ All billing actions are restricted to account owner + ADMIN only.
 * VIEWER and EDITOR team members cannot modify subscriptions.
 */

// Middleware: block VIEWER and EDITOR from billing operations
const requireBillingAccess = (req, res, next) => {
  if (req.isTeamMember && req.teamRole !== 'ADMIN') {
    return res.status(403).json({
      status: 'error',
      message: 'Only the account owner or ADMIN can manage billing',
    });
  }
  next();
};

// ✅ Toggle auto-renewal (set cancel_at_period_end)
router.post('/toggle-renewal', authMiddleware, resolveEffectiveUserId, requireBillingAccess, subscriptionController.toggleAutoRenewal);

// ✅ Cancel subscription with 7-day refund logic
router.post('/cancel', authMiddleware, resolveEffectiveUserId, requireBillingAccess, subscriptionController.cancelSubscription);

// ✅ Reactivate canceled subscription
router.post('/reactivate', authMiddleware, resolveEffectiveUserId, requireBillingAccess, subscriptionController.reactivateSubscription);

// ✅ Open Stripe billing portal (update payment method, view invoices)
router.post('/billing-portal', authMiddleware, resolveEffectiveUserId, requireBillingAccess, subscriptionController.createBillingPortal);

module.exports = router;