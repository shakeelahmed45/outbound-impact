const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async (email, priceId, planName) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // ✅ FIXED: All plans use subscription mode now
      success_url: `${process.env.FRONTEND_URL}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/plans`,
      customer_email: email,
      metadata: {
        planName: planName,
      },
    });

    return session;
  } catch (error) {
    throw error;
  }
};

const getCheckoutSession = async (sessionId) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    throw error;
  }
};

/**
 * Upgrade user's plan with prorated billing
 * @param {Object} user - Current user object from database
 * @param {String} newPriceId - New Stripe price ID
 * @param {String} newPlanName - New plan name (ORG_SMALL, ORG_MEDIUM, etc.)
 * @returns {Object} Updated subscription details
 */
const upgradePlan = async (user, newPriceId, newPlanName) => {
  try {
    console.log('=== UPGRADE PLAN DEBUG ===');
    console.log('User:', user.email);
    console.log('Current subscription:', user.subscriptionId);
    console.log('New price ID:', newPriceId);
    console.log('New plan:', newPlanName);

    // ✅ UPDATED: Individual plan is now also subscription-based
    // For users upgrading from INDIVIDUAL (if no subscriptionId exists yet)
    if (!user.subscriptionId && user.stripeCustomerId) {
      // Create new subscription with customer
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: newPriceId }],
        proration_behavior: 'none', // No proration for first subscription
        metadata: {
          planName: newPlanName,
          upgradedFrom: user.role,
        },
      });

      console.log('Created new subscription:', subscription.id);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: newPriceId,
        proratedAmount: subscription.items.data[0].price.unit_amount / 100, // Full amount for new subscription
      };
    }

    // For subscription-to-subscription upgrades
    if (!user.subscriptionId) {
      throw new Error('User has no active subscription to upgrade');
    }

    // Get current subscription details
    const currentSubscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    
    console.log('Current subscription details:', {
      id: currentSubscription.id,
      status: currentSubscription.status,
      current_period_start: currentSubscription.current_period_start,
      current_period_end: currentSubscription.current_period_end,
    });

    // Calculate prorated amount
    const now = Math.floor(Date.now() / 1000);
    const periodStart = currentSubscription.current_period_start;
    const periodEnd = currentSubscription.current_period_end;
    const totalPeriod = periodEnd - periodStart;
    const usedPeriod = now - periodStart;
    const remainingPeriod = periodEnd - now;
    const usagePercent = (usedPeriod / totalPeriod) * 100;

    console.log('Proration calculation:', {
      now,
      periodStart,
      periodEnd,
      totalPeriod: `${totalPeriod} seconds (${(totalPeriod / 86400).toFixed(1)} days)`,
      usedPeriod: `${usedPeriod} seconds (${(usedPeriod / 86400).toFixed(1)} days)`,
      remainingPeriod: `${remainingPeriod} seconds (${(remainingPeriod / 86400).toFixed(1)} days)`,
      usagePercent: `${usagePercent.toFixed(2)}%`,
    });

    // Update subscription with new price
    // Stripe automatically handles proration
    const updatedSubscription = await stripe.subscriptions.update(
      user.subscriptionId,
      {
        items: [{
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Automatically calculate prorated amounts
        metadata: {
          planName: newPlanName,
          upgradedFrom: user.role,
          upgradeDate: new Date().toISOString(),
        },
      }
    );

    console.log('Subscription updated successfully');
    console.log('New subscription details:', {
      id: updatedSubscription.id,
      status: updatedSubscription.status,
      proration_created: 'yes',
    });

    // Get the upcoming invoice to see the prorated amount
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: user.stripeCustomerId,
      subscription: user.subscriptionId,
    });

    console.log('Upcoming invoice:', {
      amount_due: upcomingInvoice.amount_due / 100, // Convert cents to dollars
      currency: upcomingInvoice.currency,
      lines: upcomingInvoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount / 100,
        proration: line.proration,
      })),
    });

    return {
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status,
      currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      priceId: newPriceId,
      proratedAmount: upcomingInvoice.amount_due / 100, // Amount to charge (in dollars)
      proratedInvoice: {
        subtotal: upcomingInvoice.subtotal / 100,
        total: upcomingInvoice.total / 100,
        amountDue: upcomingInvoice.amount_due / 100,
      },
    };

  } catch (error) {
    console.error('Upgrade plan error:', error);
    throw error;
  }
};

/**
 * Get subscription details from Stripe
 */
const getSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancel subscription
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
  upgradePlan,
  getSubscription,
  cancelSubscription,
};