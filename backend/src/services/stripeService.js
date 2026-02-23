const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createCheckoutSession = async (email, priceId, planName, couponCode = null, enterpriseConfig = null) => {
  try {
    console.log('🔵 Creating checkout session:', { email, priceId, planName, couponCode, enterpriseConfig });

    // ✅ Validate coupon code with Stripe if provided
    if (couponCode) {
      try {
        // Check if coupon exists and is valid
        const coupon = await stripe.coupons.retrieve(couponCode);
        console.log('✅ Valid coupon found:', {
          id: coupon.id,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
          valid: coupon.valid,
        });
      } catch (error) {
        console.error('❌ Invalid coupon code:', couponCode);
        throw new Error('Invalid or expired coupon code');
      }
    }

    // ✅ Handle Enterprise plans with custom pricing
    if (planName === 'ORG_ENTERPRISE' && enterpriseConfig && enterpriseConfig.calculatedPrice) {
      console.log('🏢 Creating dynamic Enterprise price:', {
        amount: enterpriseConfig.calculatedPrice,
        storageGB: enterpriseConfig.storageGB,
        teamMembers: enterpriseConfig.teamMembers
      });

      // Create a unique product for this Enterprise configuration
      const product = await stripe.products.create({
        name: `Enterprise Plan - ${enterpriseConfig.storageGB}GB / ${enterpriseConfig.teamMembers === -1 ? 'Unlimited' : enterpriseConfig.teamMembers} members`,
        description: `Custom Enterprise configuration: ${enterpriseConfig.storageGB}GB storage, ${enterpriseConfig.teamMembers === -1 ? 'Unlimited' : enterpriseConfig.teamMembers} team members`,
        metadata: {
          planType: 'ENTERPRISE',
          storageGB: enterpriseConfig.storageGB.toString(),
          teamMembers: enterpriseConfig.teamMembers.toString(),
        }
      });

      // Create a price for this product with the calculated amount
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(enterpriseConfig.calculatedPrice * 100), // Convert dollars to cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          storageGB: enterpriseConfig.storageGB.toString(),
          teamMembers: enterpriseConfig.teamMembers.toString(),
        }
      });

      console.log('✅ Dynamic Enterprise price created:', {
        priceId: price.id,
        amount: enterpriseConfig.calculatedPrice,
        productId: product.id
      });

      // Use the newly created price
      priceId = price.id;
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/plans`,
      customer_email: email,
      metadata: {
        planName: planName,
      },
    };

    // ✅ Add coupon to checkout session if provided and valid
    if (couponCode) {
      sessionConfig.discounts = [{
        coupon: couponCode,
      }];
      console.log('✅ Coupon applied to checkout session:', couponCode);
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log('✅ Checkout session created:', session.id);

    return session;
  } catch (error) {
    console.error('❌ Checkout session creation failed:', error);
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
 * Upgrade user's plan with 7-day credit billing logic
 * 
 * Within 7 days of subscription start:
 *   → Credit old plan price to customer balance → charge only the difference
 * After 7 days:
 *   → Charge full new plan price (no credit)
 * 
 * @param {Object} user - Current user object from database
 * @param {String} newPriceId - New Stripe price ID
 * @param {String} newPlanName - New plan name (ORG_SMALL, ORG_MEDIUM, etc.)
 * @returns {Object} Updated subscription details
 */
const upgradePlan = async (user, newPriceId, newPlanName) => {
  try {
    console.log('=== UPGRADE PLAN ===');
    console.log('User:', user.email);
    console.log('Current role:', user.role);
    console.log('Current subscription:', user.subscriptionId);
    console.log('New price ID:', newPriceId);
    console.log('New plan:', newPlanName);

    // ═══ Case 1: No existing subscription (e.g. free/Individual without Stripe sub) ═══
    if (!user.subscriptionId && user.stripeCustomerId) {
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: newPriceId }],
        proration_behavior: 'none',
        metadata: {
          planName: newPlanName,
          upgradedFrom: user.role,
        },
      });

      console.log('✅ Created new subscription:', subscription.id);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: newPriceId,
        proratedAmount: subscription.items.data[0].price.unit_amount / 100,
        creditApplied: 0,
      };
    }

    if (!user.subscriptionId) {
      throw new Error('User has no active subscription to upgrade');
    }

    // ═══ Case 2: Existing subscription → 7-day credit logic ═══
    let currentSubscription;
    try {
      currentSubscription = await stripe.subscriptions.retrieve(user.subscriptionId);
    } catch (retrieveError) {
      // Subscription no longer exists (possibly from a previous failed upgrade)
      console.warn('⚠️ Subscription not found in Stripe:', user.subscriptionId);
      console.warn('   Treating as no active subscription — creating fresh subscription');
      
      // Ensure customer has a payment method
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      const paymentMethod = customer.invoice_settings?.default_payment_method || customer.default_source;
      
      if (!paymentMethod) {
        throw new Error('No payment method found. Please update your payment method in Settings before upgrading.');
      }

      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: newPriceId }],
        default_payment_method: paymentMethod,
        proration_behavior: 'none',
        metadata: {
          planName: newPlanName,
          upgradedFrom: user.role,
        },
      });

      console.log('✅ Created fresh subscription:', subscription.id);

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: newPriceId,
        proratedAmount: subscription.items.data[0].price.unit_amount / 100,
        creditApplied: 0,
      };
    }

    // If subscription is already canceled, treat same as above
    if (currentSubscription.status === 'canceled') {
      console.warn('⚠️ Subscription already canceled — creating fresh subscription');
      
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      const paymentMethod = customer.invoice_settings?.default_payment_method || customer.default_source;
      
      if (!paymentMethod) {
        throw new Error('No payment method found. Please update your payment method in Settings before upgrading.');
      }

      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: newPriceId }],
        default_payment_method: paymentMethod,
        proration_behavior: 'none',
        metadata: {
          planName: newPlanName,
          upgradedFrom: user.role,
        },
      });

      return {
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: newPriceId,
        proratedAmount: subscription.items.data[0].price.unit_amount / 100,
        creditApplied: 0,
      };
    }

    console.log('Current subscription:', {
      id: currentSubscription.id,
      status: currentSubscription.status,
      current_period_start: new Date(currentSubscription.current_period_start * 1000).toISOString(),
    });

    // ═══ Capture payment method BEFORE canceling old subscription ═══
    let defaultPaymentMethod = currentSubscription.default_payment_method;
    
    if (!defaultPaymentMethod) {
      // Try to get from customer's default
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      defaultPaymentMethod = customer.invoice_settings?.default_payment_method || customer.default_source;
    }

    if (!defaultPaymentMethod) {
      // Last resort: get from the latest invoice's payment intent
      const invoices = await stripe.invoices.list({
        subscription: user.subscriptionId,
        status: 'paid',
        limit: 1,
      });
      if (invoices.data.length > 0 && invoices.data[0].payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(invoices.data[0].payment_intent);
        defaultPaymentMethod = pi.payment_method;
      }
    }

    if (!defaultPaymentMethod) {
      throw new Error('No payment method found. Please update your payment method in Settings before upgrading.');
    }

    console.log('💳 Payment method captured:', defaultPaymentMethod);

    // Ensure the payment method is set as customer default
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: defaultPaymentMethod },
    });
    console.log('✅ Payment method set as customer default');

    // Calculate days since subscription start
    const periodStartDate = new Date(currentSubscription.current_period_start * 1000);
    const now = new Date();
    const daysSinceStart = Math.floor((now - periodStartDate) / (1000 * 60 * 60 * 24));
    const isWithin7Days = daysSinceStart <= 7;

    console.log('📅 Days since period start:', daysSinceStart);
    console.log('💰 Within 7-day credit window:', isWithin7Days ? 'YES' : 'NO');

    let creditApplied = 0;

    if (isWithin7Days) {
      // ═══ Within 7 days: Credit old plan amount to customer balance ═══
      // Find the latest paid invoice for this subscription
      const invoices = await stripe.invoices.list({
        subscription: user.subscriptionId,
        status: 'paid',
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const lastPaidAmount = invoices.data[0].amount_paid; // in cents
        creditApplied = lastPaidAmount / 100; // in dollars

        console.log('💰 Old plan paid amount:', creditApplied, 'USD');
        console.log('💰 Applying credit to customer balance...');

        // Add credit to customer balance (negative = credit)
        await stripe.customers.createBalanceTransaction(user.stripeCustomerId, {
          amount: -lastPaidAmount, // negative = credit
          currency: 'usd',
          description: `Upgrade credit: ${user.role} → ${newPlanName} (within 7-day window)`,
        });

        console.log('✅ Credit of $' + creditApplied + ' applied to customer balance');
      }
    } else {
      console.log('⚠️ Past 7-day window — no credit applied, full price charged');
    }

    // Cancel old subscription immediately
    console.log('🗑️ Canceling old subscription...');
    await stripe.subscriptions.cancel(user.subscriptionId);
    console.log('✅ Old subscription canceled');

    // Create new subscription (credit balance auto-applies if within 7 days)
    console.log('🆕 Creating new subscription for:', newPlanName);
    const newSubscription = await stripe.subscriptions.create({
      customer: user.stripeCustomerId,
      items: [{ price: newPriceId }],
      default_payment_method: defaultPaymentMethod,
      proration_behavior: 'none',
      metadata: {
        planName: newPlanName,
        upgradedFrom: user.role,
        upgradeDate: new Date().toISOString(),
        creditApplied: creditApplied.toString(),
      },
    });

    console.log('✅ New subscription created:', newSubscription.id);

    // Get the actual charge amount from the latest invoice
    const newInvoice = await stripe.invoices.list({
      subscription: newSubscription.id,
      limit: 1,
    });

    const actualCharged = newInvoice.data.length > 0 
      ? newInvoice.data[0].amount_paid / 100 
      : newSubscription.items.data[0].price.unit_amount / 100;

    console.log('💰 Actual amount charged:', actualCharged, 'USD');
    console.log('💰 Credit applied:', creditApplied, 'USD');

    return {
      subscriptionId: newSubscription.id,
      status: newSubscription.status,
      currentPeriodStart: new Date(newSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(newSubscription.current_period_end * 1000),
      priceId: newPriceId,
      proratedAmount: actualCharged,
      creditApplied: creditApplied,
    };

  } catch (error) {
    console.error('❌ Upgrade plan error:', error);
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