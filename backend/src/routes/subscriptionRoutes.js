// ============================================
// 🔍 ADD THIS TO YOUR SUBSCRIPTION ROUTES
// Location: backend/src/routes/subscriptionRoutes.js
// ============================================

// ADD THIS ROUTE TO YOUR subscriptionRoutes.js:

router.get('/debug-subscription', authMiddleware, async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    
    console.log('🔍 DEBUG ENDPOINT CALLED');
    console.log('   req.user:', req.user);
    console.log('   userId:', req.user.userId);

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stripeCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        priceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      }
    });

    console.log('   Database user:', user);

    if (!user) {
      return res.json({
        status: 'error',
        message: 'User not found in database',
        receivedUserId: req.user.userId
      });
    }

    // Check what the controller checks
    const checks = {
      userExists: !!user,
      hasStripeCustomerId: !!user.stripeCustomerId,
      hasSubscriptionId: !!user.subscriptionId,
      hasValidStatus: user.subscriptionStatus && user.subscriptionStatus !== 'canceled' && user.subscriptionStatus !== 'incomplete',
      
      // The actual check from controller
      passesCheck: !!(user.stripeCustomerId && user.subscriptionId && user.subscriptionStatus && user.subscriptionStatus !== 'canceled' && user.subscriptionStatus !== 'incomplete')
    };

    res.json({
      status: 'success',
      message: 'Debug information',
      jwt: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      },
      databaseUser: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stripeCustomerId: user.stripeCustomerId || null,
        subscriptionId: user.subscriptionId || null,
        subscriptionStatus: user.subscriptionStatus || null,
        priceId: user.priceId || null,
        currentPeriodStart: user.currentPeriodStart || null,
        currentPeriodEnd: user.currentPeriodEnd || null,
      },
      checks,
      wouldPass: checks.passesCheck,
      failureReason: !checks.passesCheck ? (
        !checks.hasStripeCustomerId ? 'Missing stripeCustomerId' :
        !checks.hasSubscriptionId ? 'Missing subscriptionId' :
        !checks.hasValidStatus ? 'Invalid subscription status: ' + user.subscriptionStatus :
        'Unknown'
      ) : null
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// COMPLETE UPDATED subscriptionRoutes.js FILE:
// ============================================

const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/auth');

// 🔍 DEBUG ENDPOINT - Add this temporarily to diagnose issue
router.get('/debug-subscription', authMiddleware, async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    
    console.log('🔍 DEBUG ENDPOINT CALLED');
    console.log('   req.user:', req.user);
    console.log('   userId:', req.user.userId);

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stripeCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        priceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      }
    });

    console.log('   Database user:', user);

    if (!user) {
      return res.json({
        status: 'error',
        message: 'User not found in database',
        receivedUserId: req.user.userId
      });
    }

    const checks = {
      userExists: !!user,
      hasStripeCustomerId: !!user.stripeCustomerId,
      hasSubscriptionId: !!user.subscriptionId,
      hasValidStatus: user.subscriptionStatus && user.subscriptionStatus !== 'canceled' && user.subscriptionStatus !== 'incomplete',
      passesCheck: !!(user.stripeCustomerId && user.subscriptionId && user.subscriptionStatus && user.subscriptionStatus !== 'canceled' && user.subscriptionStatus !== 'incomplete')
    };

    res.json({
      status: 'success',
      message: 'Debug information',
      jwt: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
      },
      databaseUser: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stripeCustomerId: user.stripeCustomerId || null,
        subscriptionId: user.subscriptionId || null,
        subscriptionStatus: user.subscriptionStatus || null,
        priceId: user.priceId || null,
        currentPeriodStart: user.currentPeriodStart || null,
        currentPeriodEnd: user.currentPeriodEnd || null,
      },
      checks,
      wouldPass: checks.passesCheck,
      failureReason: !checks.passesCheck ? (
        !checks.hasStripeCustomerId ? 'Missing stripeCustomerId' :
        !checks.hasSubscriptionId ? 'Missing subscriptionId' :
        !checks.hasValidStatus ? 'Invalid subscription status: ' + user.subscriptionStatus :
        'Unknown'
      ) : null
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ✅ Toggle auto-renewal (set cancel_at_period_end)
router.post('/toggle-renewal', authMiddleware, subscriptionController.toggleAutoRenewal);

// ✅ Cancel subscription with prorated refund
router.post('/cancel', authMiddleware, subscriptionController.cancelSubscription);

module.exports = router;