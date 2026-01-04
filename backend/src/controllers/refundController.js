// ✅ REFUND CONTROLLER - COMPLETE WITH DIAGNOSTICS
console.log('🔍 [REFUND] Loading refundController.js...');

const prisma = require('../lib/prisma');
console.log('✅ [REFUND] Prisma loaded');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log('✅ [REFUND] Stripe loaded');

/**
 * Check if user is eligible for refund
 */
const checkRefundEligibility = async (req, res) => {
  console.log('🔍 [REFUND] checkRefundEligibility called for user:', req.user?.userId);
  
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionId: true,
        currentPeriodStart: true,
        refundRequested: true,
        refundStatus: true,
        refundProcessedAt: true,
      }
    });

    if (!user) {
      console.log('❌ [REFUND] User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.refundRequested) {
      console.log('⚠️ [REFUND] User already requested refund:', user.email);
      return res.json({
        status: 'success',
        eligible: false,
        reason: 'refund_already_requested',
        message: 'You have already requested a refund',
        refundStatus: user.refundStatus,
        refundProcessedAt: user.refundProcessedAt
      });
    }

    if (!user.subscriptionId) {
      console.log('⚠️ [REFUND] No subscription found:', user.email);
      return res.json({
        status: 'success',
        eligible: false,
        reason: 'no_subscription',
        message: 'No active subscription found'
      });
    }

    if (!user.currentPeriodStart) {
      console.log('⚠️ [REFUND] No subscription start date:', user.email);
      return res.json({
        status: 'success',
        eligible: false,
        reason: 'no_start_date',
        message: 'Subscription start date not found'
      });
    }

    const daysSinceSubscription = Math.floor(
      (new Date() - new Date(user.currentPeriodStart)) / (1000 * 60 * 60 * 24)
    );

    const eligible = daysSinceSubscription <= 7;
    const daysRemaining = Math.max(0, 7 - daysSinceSubscription);

    console.log('✅ [REFUND] Eligibility check:', { 
      email: user.email, 
      eligible, 
      daysSinceSubscription,
      daysRemaining 
    });

    res.json({
      status: 'success',
      eligible: eligible,
      reason: eligible ? 'eligible' : 'outside_window',
      message: eligible 
        ? `You are eligible for a refund. ${daysRemaining} days remaining.`
        : `Refund period has expired. Refunds are only available within 7 days of subscription.`,
      daysRemaining: daysRemaining,
      subscriptionStartDate: user.currentPeriodStart,
      daysSinceSubscription: daysSinceSubscription
    });

  } catch (error) {
    console.error('❌ [REFUND] Check eligibility error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check refund eligibility'
    });
  }
};

/**
 * Request a refund - DELETES ACCOUNT AND ALL DATA
 */
const requestRefund = async (req, res) => {
  console.log('💰 [REFUND] requestRefund called for user:', req.user?.userId);
  
  try {
    const userId = req.user.userId;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      console.log('❌ [REFUND] Invalid reason provided');
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a reason for the refund (minimum 10 characters)'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionId: true,
        stripeCustomerId: true,
        currentPeriodStart: true,
        refundRequested: true,
      }
    });

    if (!user) {
      console.log('❌ [REFUND] User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.refundRequested) {
      console.log('⚠️ [REFUND] Duplicate refund request:', user.email);
      return res.status(400).json({
        status: 'error',
        message: 'You have already requested a refund'
      });
    }

    if (!user.subscriptionId || !user.stripeCustomerId) {
      console.log('❌ [REFUND] No active subscription:', user.email);
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found'
      });
    }

    if (!user.currentPeriodStart) {
      console.log('❌ [REFUND] No subscription start date:', user.email);
      return res.status(400).json({
        status: 'error',
        message: 'Subscription start date not found'
      });
    }

    const daysSinceSubscription = Math.floor(
      (new Date() - new Date(user.currentPeriodStart)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSubscription > 7) {
      console.log('❌ [REFUND] Outside 7-day window:', user.email, daysSinceSubscription, 'days');
      return res.status(400).json({
        status: 'error',
        message: 'Refund period has expired. Refunds are only available within 7 days of subscription.'
      });
    }

    console.log('📄 [REFUND] Fetching invoice from Stripe...');
    const invoices = await stripe.invoices.list({
      subscription: user.subscriptionId,
      limit: 1
    });

    if (!invoices.data.length) {
      console.log('❌ [REFUND] No invoice found:', user.email);
      return res.status(400).json({
        status: 'error',
        message: 'No invoice found for this subscription'
      });
    }

    const invoice = invoices.data[0];
    const chargeId = invoice.charge;

    if (!chargeId) {
      console.log('❌ [REFUND] No charge found:', user.email);
      return res.status(400).json({
        status: 'error',
        message: 'No charge found for this subscription'
      });
    }

    console.log('💳 [REFUND] Creating Stripe refund...');
    console.log('   User:', user.email);
    console.log('   Charge ID:', chargeId);
    console.log('   Amount:', invoice.amount_paid / 100);

    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: 'requested_by_customer',
      metadata: {
        user_id: user.id,
        user_email: user.email,
        user_reason: reason.substring(0, 500)
      }
    });

    console.log('✅ [REFUND] Stripe refund created:', refund.id);

    console.log('🚫 [REFUND] Canceling subscription...');
    await stripe.subscriptions.cancel(user.subscriptionId);
    console.log('✅ [REFUND] Subscription canceled');

    console.log('📧 [REFUND] Sending emails...');
    const emailService = require('../services/emailService');
    
    try {
      await emailService.sendRefundAccountDeletionEmail({
        userEmail: user.email,
        userName: user.name,
        refundAmount: refund.amount / 100,
        refundId: refund.id,
      });
      console.log('✅ [REFUND] User email sent');

      await new Promise(resolve => setTimeout(resolve, 1000));

      await emailService.sendAdminRefundNotification({
        userName: user.name,
        userEmail: user.email,
        refundAmount: refund.amount / 100,
        refundReason: reason,
        refundId: refund.id,
        userRole: user.role,
      });
      console.log('✅ [REFUND] Admin email sent');
    } catch (emailError) {
      console.error('⚠️ [REFUND] Email error:', emailError.message);
    }

    console.log('🗑️ [REFUND] Deleting user account...');
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('✅ [REFUND] Account deleted successfully');

    res.json({
      status: 'success',
      message: 'Refund processed and account deleted successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase(),
        status: refund.status,
        processedAt: new Date(),
      }
    });

  } catch (error) {
    console.error('❌ [REFUND] Request refund error:', error);
    
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        status: 'error',
        message: error.message || 'Failed to process refund with Stripe'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to process refund. Please contact support.'
    });
  }
};

/**
 * Get refund status
 */
const getRefundStatus = async (req, res) => {
  console.log('📊 [REFUND] getRefundStatus called for user:', req.user?.userId);
  
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        refundRequested: true,
        refundRequestedAt: true,
        refundProcessedAt: true,
        refundAmount: true,
        refundReason: true,
        refundStatus: true,
      }
    });

    if (!user) {
      console.log('❌ [REFUND] User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    console.log('✅ [REFUND] Status retrieved for user');

    res.json({
      status: 'success',
      refund: {
        requested: user.refundRequested,
        requestedAt: user.refundRequestedAt,
        processedAt: user.refundProcessedAt,
        amount: user.refundAmount ? parseFloat(user.refundAmount) : null,
        reason: user.refundReason,
        status: user.refundStatus,
      }
    });

  } catch (error) {
    console.error('❌ [REFUND] Get refund status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get refund status'
    });
  }
};