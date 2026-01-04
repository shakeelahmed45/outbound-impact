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
    console.log('   User ID:', userId);

    // ✅ FIXED: Get user with ALL subscription fields including stripeCustomerId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,      // ✅ ADDED - Critical field!
        subscriptionId: true,
        subscriptionStatus: true,
        priceId: true,
        currentPeriodEnd: true,
        currentPeriodStart: true,
      }
    });

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // ✅ FIXED: Check BOTH stripeCustomerId AND subscriptionId
    if (!user.stripeCustomerId || !user.subscriptionId) {
      console.error('❌ Missing subscription data:');
      console.error('   stripeCustomerId:', user.stripeCustomerId || 'MISSING');
      console.error('   subscriptionId:', user.subscriptionId || 'MISSING');
      
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found. Please subscribe to a plan first.'
      });
    }

    // ✅ FIXED: Check subscription status
    if (user.subscriptionStatus === 'canceled' || user.subscriptionStatus === 'incomplete') {
      console.error('❌ Invalid subscription status:', user.subscriptionStatus);
      
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found. Please subscribe to a plan first.'
      });
    }

    console.log('✅ User subscription found:');
    console.log('   Email:', user.email);
    console.log('   Stripe Customer ID:', user.stripeCustomerId);
    console.log('   Subscription ID:', user.subscriptionId);
    console.log('   Status:', user.subscriptionStatus);

    // Update subscription in Stripe
    const subscription = await stripe.subscriptions.update(
      user.subscriptionId,
      {
        cancel_at_period_end: !autoRenewal  // If autoRenewal is true, set cancel_at_period_end to false
      }
    );

    console.log('✅ Stripe subscription updated:', subscription.id);
    console.log('   cancel_at_period_end:', subscription.cancel_at_period_end);

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
        photo: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
        priceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        storageUsed: true,
        storageLimit: true,
        isTeamMember: true,
        teamRole: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      }
    });

    console.log('✅ User updated:', user.email, '- Status:', updatedUser.subscriptionStatus);

    res.json({
      status: 'success',
      message: autoRenewal 
        ? 'Auto-renewal enabled. Your subscription will continue automatically.' 
        : 'Auto-renewal disabled. Subscription will end on ' + new Date(subscription.current_period_end * 1000).toLocaleDateString(),
      user: {
        ...updatedUser,
        storageUsed: updatedUser.storageUsed.toString(),
        storageLimit: updatedUser.storageLimit.toString(),
      },
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    });

  } catch (error) {
    console.error('❌ Toggle renewal error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error type:', error.type);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to toggle auto-renewal'
    });
  }
};

/**
 * ✅ CANCEL SUBSCRIPTION WITH 7-DAY REFUND LOGIC
 * 
 * - Within 7 days: Full refund + immediate cancellation
 * - After 7 days: Cancel at period end (no refund)
 */
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🗑️ Canceling subscription for user:', userId);

    // Get user with ALL subscription fields
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        priceId: true,
      }
    });

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check for active subscription
    if (!user.stripeCustomerId || !user.subscriptionId) {
      console.error('❌ Missing subscription data:');
      console.error('   stripeCustomerId:', user.stripeCustomerId || 'MISSING');
      console.error('   subscriptionId:', user.subscriptionId || 'MISSING');
      
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found.'
      });
    }

    // Check subscription status
    if (user.subscriptionStatus === 'canceled') {
      console.error('❌ Subscription already canceled:', user.subscriptionStatus);
      
      return res.status(400).json({
        status: 'error',
        message: 'Subscription is already canceled.'
      });
    }

    console.log('✅ User subscription found:');
    console.log('   Email:', user.email);
    console.log('   Stripe Customer ID:', user.stripeCustomerId);
    console.log('   Subscription ID:', user.subscriptionId);
    console.log('   Status:', user.subscriptionStatus);
    console.log('   Period Start:', user.currentPeriodStart);

    // ✅ CALCULATE 7-DAY REFUND ELIGIBILITY
    let isRefundEligible = false;
    let daysSinceStart = 999; // Default to high number if no start date

    if (user.currentPeriodStart) {
      const subscriptionDate = new Date(user.currentPeriodStart);
      const now = new Date();
      const diffTime = now - subscriptionDate;
      daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      isRefundEligible = daysSinceStart <= 7;
      
      console.log('📅 Subscription age:', daysSinceStart, 'days');
      console.log('💰 Refund eligible:', isRefundEligible ? 'YES' : 'NO');
    } else {
      console.warn('⚠️ No currentPeriodStart found - cannot check refund eligibility');
    }

    let refundInfo = null;
    let cancellationMessage = '';

    if (isRefundEligible) {
      // ✅ WITHIN 7 DAYS: Cancel immediately with full refund
      console.log('✅ Within 7-day refund window - processing refund');

      // Cancel subscription immediately
      const canceledSubscription = await stripe.subscriptions.cancel(
        user.subscriptionId
      );

      console.log('✅ Subscription canceled in Stripe:', canceledSubscription.id);

      // Get the latest invoice to refund
      const invoices = await stripe.invoices.list({
        subscription: user.subscriptionId,
        limit: 1
      });

      if (invoices.data.length > 0 && invoices.data[0].paid) {
        const invoice = invoices.data[0];
        
        // Create full refund
        const refund = await stripe.refunds.create({
          payment_intent: invoice.payment_intent,
          reason: 'requested_by_customer',
        });

        console.log('💰 Refund processed:', refund.id);
        console.log('   Amount:', (refund.amount / 100).toFixed(2), refund.currency.toUpperCase());

        refundInfo = {
          id: refund.id,
          amount: refund.amount,
          currency: refund.currency,
        };

        cancellationMessage = `Subscription canceled and refund of $${(refund.amount / 100).toFixed(2)} ${refund.currency.toUpperCase()} has been processed. You will see the refund in 5-10 business days.`;
      } else {
        cancellationMessage = 'Subscription canceled successfully.';
      }

      // Update database immediately
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'canceled',
        }
      });

    } else {
      // ❌ AFTER 7 DAYS: Cancel at period end (no refund)
      console.log('⚠️ Past 7-day refund window - canceling at period end');

      // Set subscription to cancel at period end (no immediate cancellation)
      const updatedSubscription = await stripe.subscriptions.update(
        user.subscriptionId,
        {
          cancel_at_period_end: true
        }
      );

      console.log('⚠️ Subscription set to cancel at period end:', updatedSubscription.cancel_at);
      console.log('   Access until:', new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString());

      // Update database to "canceling" status
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'canceling',
        }
      });

      const accessUntilDate = new Date(updatedSubscription.current_period_end * 1000).toLocaleDateString();
      cancellationMessage = `Subscription will be canceled on ${accessUntilDate}. You will have access to all features until then. No refund is available as the 7-day refund period has passed.`;
    }

    // Send cancellation email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendCancellationEmail(user.email, user.name);
      console.log('📧 Cancellation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send cancellation email:', emailError.message);
    }

    // Get updated user data with ALL necessary fields
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        photo: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
        priceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        storageUsed: true,
        storageLimit: true,
        isTeamMember: true,
        teamRole: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
      }
    });

    console.log('✅ Cancellation complete:', user.email);
    console.log('   Updated status:', updatedUser.subscriptionStatus);

    res.json({
      status: 'success',
      message: cancellationMessage,
      isRefundEligible: isRefundEligible,
      daysSinceStart: daysSinceStart,
      user: {
        ...updatedUser,
        storageUsed: updatedUser.storageUsed.toString(),
        storageLimit: updatedUser.storageLimit.toString(),
      },
      refund: refundInfo,
      currentPeriodEnd: user.currentPeriodEnd,
    });

  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    console.error('   Error message:', error.message);
    console.error('   Error type:', error.type);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to cancel subscription'
    });
  }
};

/**
 * ✅ REACTIVATE CANCELED SUBSCRIPTION
 * 
 * Creates a new Stripe checkout session for a canceled subscription
 */
const reactivateSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🔄 Reactivating subscription for user:', userId);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionStatus: true,
        priceId: true,
      }
    });

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if subscription is actually canceled
    if (user.subscriptionStatus !== 'canceled') {
      console.error('❌ Subscription not canceled:', user.subscriptionStatus);
      return res.status(400).json({
        status: 'error',
        message: 'Subscription is not canceled. Current status: ' + user.subscriptionStatus
      });
    }

    // Determine which price ID to use based on user's role
    let priceId = user.priceId; // Try to use their previous price

    if (!priceId) {
      // If no previous price, determine from role
      const roleToPriceMap = {
        'INDIVIDUAL': process.env.STRIPE_INDIVIDUAL_PRICE,
        'ORG_SMALL': process.env.STRIPE_SMALL_ORG_PRICE,
        'ORG_MEDIUM': process.env.STRIPE_MEDIUM_ORG_PRICE,
        'ORG_ENTERPRISE': process.env.STRIPE_ENTERPRISE_PRICE,
      };

      priceId = roleToPriceMap[user.role];
    }

    if (!priceId) {
      console.error('❌ Could not determine price ID for role:', user.role);
      return res.status(400).json({
        status: 'error',
        message: 'Could not determine subscription plan'
      });
    }

    console.log('✅ Creating checkout session for reactivation:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Price ID:', priceId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?reactivated=true`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?reactivation_canceled=true`,
      metadata: {
        userId: user.id,
        reactivation: 'true',
      },
    });

    console.log('✅ Checkout session created:', session.id);
    console.log('   URL:', session.url);

    res.json({
      status: 'success',
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('❌ Reactivate subscription error:', error);
    console.error('   Error message:', error.message);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to reactivate subscription'
    });
  }
};

module.exports = {
  toggleAutoRenewal,
  cancelSubscription,
  reactivateSubscription,
};