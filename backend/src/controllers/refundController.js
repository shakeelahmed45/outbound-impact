const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * 🔄 REFUND CONTROLLER - WITH ACCOUNT DELETION
 * Handles 7-day refund requests with complete account deletion
 */

/**
 * Check if user is eligible for refund
 */
const checkRefundEligibility = async (req, res) => {
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
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if already requested refund
    if (user.refundRequested) {
      return res.json({
        status: 'success',
        eligible: false,
        reason: 'refund_already_requested',
        message: 'You have already requested a refund',
        refundStatus: user.refundStatus,
        refundProcessedAt: user.refundProcessedAt
      });
    }

    // Check if has subscription
    if (!user.subscriptionId) {
      return res.json({
        status: 'success',
        eligible: false,
        reason: 'no_subscription',
        message: 'No active subscription found'
      });
    }

    // Check if within 7 days
    if (!user.currentPeriodStart) {
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
    console.error('Check refund eligibility error:', error);
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
  try {
    const userId = req.user.userId;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
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
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if already requested
    if (user.refundRequested) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already requested a refund'
      });
    }

    // Check if has subscription
    if (!user.subscriptionId || !user.stripeCustomerId) {
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found'
      });
    }

    // Check if within 7 days
    if (!user.currentPeriodStart) {
      return res.status(400).json({
        status: 'error',
        message: 'Subscription start date not found'
      });
    }

    const daysSinceSubscription = Math.floor(
      (new Date() - new Date(user.currentPeriodStart)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSubscription > 7) {
      return res.status(400).json({
        status: 'error',
        message: 'Refund period has expired. Refunds are only available within 7 days of subscription.'
      });
    }

    // Get the latest invoice to find the charge
    const invoices = await stripe.invoices.list({
      subscription: user.subscriptionId,
      limit: 1
    });

    if (!invoices.data.length) {
      return res.status(400).json({
        status: 'error',
        message: 'No invoice found for this subscription'
      });
    }

    const invoice = invoices.data[0];
    const chargeId = invoice.charge;

    if (!chargeId) {
      return res.status(400).json({
        status: 'error',
        message: 'No charge found for this subscription'
      });
    }

    // Process the refund through Stripe
    console.log('💰 Processing refund for user:', user.email);
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

    console.log('✅ Stripe refund created:', refund.id);

    // Cancel the subscription
    await stripe.subscriptions.cancel(user.subscriptionId);
    console.log('✅ Subscription canceled');

    // Store refund info before deleting user
    const refundData = {
      userName: user.name,
      userEmail: user.email,
      refundAmount: refund.amount / 100,
      refundId: refund.id,
      refundReason: reason,
      userRole: user.role,
    };

    // Send emails BEFORE deleting account
    const emailPromises = [];

    // Send confirmation to user
    const emailService = require('../services/emailService');
    emailPromises.push(
      emailService.sendRefundAccountDeletionEmail({
        userEmail: user.email,
        userName: user.name,
        refundAmount: refund.amount / 100,
        refundId: refund.id,
      })
    );

    // Wait 1 second for rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send notification to admin
    emailPromises.push(
      emailService.sendAdminRefundNotification({
        userName: user.name,
        userEmail: user.email,
        refundAmount: refund.amount / 100,
        refundReason: reason,
        refundId: refund.id,
        userRole: user.role,
      })
    );

    // Wait for emails to send
    try {
      await Promise.all(emailPromises);
      console.log('✅ Refund emails sent');
    } catch (emailError) {
      console.error('❌ Failed to send refund emails:', emailError.message);
    }

    // ⚠️ CRITICAL: DELETE USER ACCOUNT AND ALL DATA
    // Prisma will cascade delete all related data automatically
    console.log('🗑️ Deleting user account and all data...');
    
    await prisma.user.delete({
      where: { id: user.id }
    });

    console.log('✅ User account and all data deleted successfully');

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
    console.error('Request refund error:', error);
    
    // Check if it's a Stripe error
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
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

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
    console.error('Get refund status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get refund status'
    });
  }
};

module.exports = {
  checkRefundEligibility,
  requestRefund,
  getRefundStatus,
};