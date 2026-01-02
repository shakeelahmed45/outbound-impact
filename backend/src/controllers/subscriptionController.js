const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * ✅ TOGGLE AUTO-RENEWAL
 * 
 * Turn auto-renewal ON/OFF by setting cancel_at_period_end
 * - ON (true): Subscription continues and renews automatically
 * - OFF (false): Subscription cancels at end of period (no refund)
 */
const toggleAutoRenewal = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { autoRenewal } = req.body;

    console.log('🔄 Toggling auto-renewal:', autoRenewal ? 'ON' : 'OFF');

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionId: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.subscriptionId) {
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found'
      });
    }

    // Update subscription in Stripe
    const subscription = await stripe.subscriptions.update(
      user.subscriptionId,
      {
        cancel_at_period_end: !autoRenewal  // If autoRenewal is true, set cancel_at_period_end to false
      }
    );

    console.log('✅ Stripe subscription updated:', subscription.id);

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: autoRenewal ? 'active' : 'canceling',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        storageUsed: true,
        storageLimit: true,
      }
    });

    console.log('✅ User updated:', user.email, '- Status:', updatedUser.subscriptionStatus);

    res.json({
      status: 'success',
      message: autoRenewal 
        ? 'Auto-renewal enabled' 
        : 'Auto-renewal disabled - subscription will end on ' + new Date(subscription.current_period_end * 1000).toLocaleDateString(),
      user: {
        ...updatedUser,
        storageUsed: updatedUser.storageUsed.toString(),
        storageLimit: updatedUser.storageLimit.toString(),
      },
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    });

  } catch (error) {
    console.error('❌ Toggle renewal error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to toggle auto-renewal'
    });
  }
};

/**
 * ✅ CANCEL SUBSCRIPTION WITH PRORATED REFUND
 * 
 * Immediately cancel subscription and issue prorated refund for unused time
 */
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🗑️ Canceling subscription with refund for user:', userId);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionId: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        priceId: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.subscriptionId) {
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found'
      });
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    
    // Calculate prorated refund amount
    const now = Math.floor(Date.now() / 1000);
    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;
    const totalPeriod = periodEnd - periodStart;
    const timeUsed = now - periodStart;
    const timeRemaining = periodEnd - now;
    
    // Get the price amount
    const price = await stripe.prices.retrieve(user.priceId);
    const fullAmount = price.unit_amount; // Amount in cents
    
    // Calculate refund (prorated based on time remaining)
    const refundAmount = Math.floor((timeRemaining / totalPeriod) * fullAmount);
    
    console.log('📊 Refund calculation:');
    console.log('   Full amount:', fullAmount / 100, 'USD');
    console.log('   Time remaining:', Math.floor(timeRemaining / 86400), 'days');
    console.log('   Refund amount:', refundAmount / 100, 'USD');

    let refund = null;

    // Only issue refund if there's a significant amount (> $1)
    if (refundAmount > 100) {
      // Get the latest invoice
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        subscription: user.subscriptionId,
        limit: 1,
      });

      if (invoices.data.length > 0 && invoices.data[0].charge) {
        // Create refund for prorated amount
        refund = await stripe.refunds.create({
          charge: invoices.data[0].charge,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            userId: user.id,
            email: user.email,
            reason: 'Prorated refund for subscription cancellation'
          }
        });

        console.log('✅ Refund created:', refund.id, '-', refundAmount / 100, 'USD');
      }
    } else {
      console.log('ℹ️ No refund issued (amount too small or period nearly complete)');
    }

    // Cancel subscription immediately in Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(user.subscriptionId);
    
    console.log('✅ Subscription canceled in Stripe:', canceledSubscription.id);

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'canceled',
        subscriptionId: null, // Clear subscription ID
        priceId: null,
        // Keep currentPeriodEnd for reference
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        storageUsed: true,
        storageLimit: true,
      }
    });

    console.log('✅ User subscription canceled:', user.email);

    // Send cancellation email (optional)
    try {
      const emailService = require('../services/emailService');
      // You can create a sendCancellationEmail function if needed
      console.log('📧 Cancellation email would be sent to:', user.email);
    } catch (emailError) {
      console.log('⚠️ Email service not available');
    }

    res.json({
      status: 'success',
      message: 'Subscription canceled successfully' + (refund ? ` and refund of $${(refundAmount / 100).toFixed(2)} has been processed` : ''),
      user: {
        ...updatedUser,
        storageUsed: updatedUser.storageUsed.toString(),
        storageLimit: updatedUser.storageLimit.toString(),
      },
      refund: refund ? {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
      } : null,
    });

  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to cancel subscription'
    });
  }
};

module.exports = {
  toggleAutoRenewal,
  cancelSubscription,
};