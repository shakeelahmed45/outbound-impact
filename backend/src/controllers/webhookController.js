const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * 🎯 STRIPE WEBHOOK HANDLER
 * 
 * This handles all Stripe events to keep database in sync with Stripe
 * CRITICAL for subscription renewals, payment failures, cancellations
 */

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured!');
    return res.status(500).json({ 
      status: 'error', 
      message: 'Webhook secret not configured' 
    });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ 
      status: 'error', 
      message: `Webhook Error: ${err.message}` 
    });
  }

  // Handle the event
  try {
    switch (event.type) {
      // ============================================
      // CHECKOUT COMPLETED (Initial Payment)
      // ============================================
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      // ============================================
      // SUBSCRIPTION EVENTS
      // ============================================
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      // ============================================
      // INVOICE/PAYMENT EVENTS
      // ============================================
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      // ============================================
      // CUSTOMER EVENTS
      // ============================================
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ status: 'success', received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Webhook processing failed' 
    });
  }
};

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * ✅ FIXED: Handle checkout.session.completed
 * This is called when initial payment is successful
 * THIS IS THE CRITICAL FIX!
 */
const handleCheckoutCompleted = async (session) => {
  console.log('💳 Processing checkout.session.completed:', session.id);

  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  console.log('📧 Customer Email:', customerEmail);
  console.log('👤 Customer ID:', customerId);
  console.log('📋 Subscription ID:', subscriptionId);

  if (!customerEmail) {
    console.error('❌ No customer email in checkout session!');
    return;
  }

  try {
    // ✅ STEP 1: Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: customerEmail.toLowerCase() }
    });

    if (!user) {
      console.error('❌ User not found for email:', customerEmail);
      return;
    }

    console.log('✅ Found user:', user.email, 'ID:', user.id);

    // ✅ STEP 2: Get the subscription details from Stripe
    let subscription = null;
    let priceId = null;
    let planName = 'Free';

    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      priceId = subscription.items.data[0].price.id;
      
      // Determine plan name from price ID
      const priceIdMap = {
        [process.env.STRIPE_PRICE_INDIVIDUAL]: 'Individual',
        [process.env.STRIPE_PRICE_SMALL_ORG]: 'Small Org',
        [process.env.STRIPE_PRICE_MEDIUM_ORG]: 'Medium Org',
        [process.env.STRIPE_PRICE_ENTERPRISE]: 'Enterprise',
      };
      
      planName = priceIdMap[priceId] || 'Individual';
      console.log('📦 Plan:', planName);
    }

    // ✅ STEP 3: Update user with Stripe details
    const updateData = {
      stripeCustomerId: customerId, // ← THIS IS THE KEY FIX!
    };

    if (subscription) {
      updateData.subscriptionId = subscriptionId;
      updateData.subscriptionStatus = subscription.status;
      updateData.priceId = priceId;
      // Note: subscriptionPlan is not in schema - determine from priceId in frontend
      updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log('✅ User updated with Stripe details!');
    console.log('   Stripe Customer ID:', customerId);
    console.log('   Subscription ID:', subscriptionId);
    console.log('   Plan:', planName);
    console.log('   Status:', subscription?.status || 'N/A');

    // ✅ STEP 4: Send welcome email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendWelcomeEmail(user.email, user.name, planName);
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError.message);
    }

    // ✅ STEP 5: Send admin notification
    try {
      const emailService = require('../services/emailService');
      await emailService.sendAdminNotification({
        userEmail: user.email,
        userName: user.name,
        plan: planName,
        amount: session.amount_total ? (session.amount_total / 100) : 0
      });
      console.log('✅ Admin notification sent');
    } catch (emailError) {
      console.error('❌ Failed to send admin notification:', emailError.message);
    }

    console.log('✅ Checkout completed successfully for:', user.email);

  } catch (error) {
    console.error('❌ Error handling checkout.completed:', error);
  }
};

/**
 * Handle customer.subscription.created
 * Called when a new subscription is created
 */
const handleSubscriptionCreated = async (subscription) => {
  console.log('🆕 Processing subscription.created:', subscription.id);

  const customerId = subscription.customer;
  const priceId = subscription.items.data[0].price.id;
  
  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.log('⚠️ User not found for customer:', customerId);
      return;
    }

    // Determine plan name from price ID
    const priceIdMap = {
      [process.env.STRIPE_PRICE_INDIVIDUAL]: 'Individual',
      [process.env.STRIPE_PRICE_SMALL_ORG]: 'Small Org',
      [process.env.STRIPE_PRICE_MEDIUM_ORG]: 'Medium Org',
      [process.env.STRIPE_PRICE_ENTERPRISE]: 'Enterprise',
    };
    
    const planName = priceIdMap[priceId] || 'Individual';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        priceId: priceId,
        // Note: subscriptionPlan not in schema - determine from priceId
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    });

    console.log('✅ Subscription created for user:', user.email);
  } catch (error) {
    console.error('❌ Error handling subscription.created:', error);
  }
};

/**
 * Handle customer.subscription.updated
 * Called when subscription is modified (upgrade, downgrade, renewal)
 * THIS IS CRITICAL FOR MONTHLY RENEWALS!
 */
const handleSubscriptionUpdated = async (subscription) => {
  console.log('🔄 Processing subscription.updated:', subscription.id);

  const customerId = subscription.customer;
  const priceId = subscription.items.data[0].price.id;

  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.log('⚠️ User not found for customer:', customerId);
      return;
    }

    // Determine plan name from price ID (for logging only)
    const priceIdMap = {
      [process.env.STRIPE_PRICE_INDIVIDUAL]: 'Individual',
      [process.env.STRIPE_PRICE_SMALL_ORG]: 'Small Org',
      [process.env.STRIPE_PRICE_MEDIUM_ORG]: 'Medium Org',
      [process.env.STRIPE_PRICE_ENTERPRISE]: 'Enterprise',
    };
    
    const planName = priceIdMap[priceId] || 'Individual';

    // Update subscription details
    const updateData = {
      subscriptionStatus: subscription.status,
      priceId: priceId,
      // Note: subscriptionPlan not in schema - determine from priceId
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    // If subscription was canceled, mark cancel date
    if (subscription.cancel_at_period_end) {
      updateData.subscriptionStatus = 'canceling';
      console.log('⚠️ Subscription set to cancel at period end');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log('✅ Subscription updated for user:', user.email);
    console.log('   Status:', subscription.status);
    console.log('   Plan:', planName);
    console.log('   Period End:', new Date(subscription.current_period_end * 1000));
  } catch (error) {
    console.error('❌ Error handling subscription.updated:', error);
  }
};

/**
 * Handle customer.subscription.deleted
 * Called when subscription is canceled/deleted
 */
const handleSubscriptionDeleted = async (subscription) => {
  console.log('🗑️ Processing subscription.deleted:', subscription.id);

  const customerId = subscription.customer;

  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.log('⚠️ User not found for customer:', customerId);
      return;
    }

    // Update user to reflect canceled subscription
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
        // Note: subscriptionPlan not in schema
        // Keep subscriptionId for reference
        // currentPeriodEnd stays as is (they have access until this date)
      }
    });

    console.log('✅ Subscription canceled for user:', user.email);

    // Send cancellation email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendCancellationEmail(user.email, user.name);
      console.log('📧 Cancellation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send cancellation email:', emailError.message);
    }

  } catch (error) {
    console.error('❌ Error handling subscription.deleted:', error);
  }
};

/**
 * Handle invoice.payment_succeeded
 * Called when a payment succeeds (including renewals)
 * THIS ENSURES RENEWALS ARE TRACKED!
 */
const handlePaymentSucceeded = async (invoice) => {
  console.log('💰 Processing payment_succeeded:', invoice.id);

  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  // Skip if no subscription (one-time payment)
  if (!subscriptionId) {
    console.log('ℹ️ One-time payment, skipping subscription update');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.log('⚠️ User not found for customer:', customerId);
      return;
    }

    // Get updated subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    });

    console.log('✅ Payment succeeded for user:', user.email);
    console.log('   Amount:', invoice.amount_paid / 100, invoice.currency.toUpperCase());
    console.log('   New period end:', new Date(subscription.current_period_end * 1000));

    // Send payment receipt email
    try {
      const emailService = require('../services/emailService');
      
      // Determine plan name from priceId for email
      const priceIdMap = {
        [process.env.STRIPE_PRICE_INDIVIDUAL]: 'Individual',
        [process.env.STRIPE_PRICE_SMALL_ORG]: 'Small Org',
        [process.env.STRIPE_PRICE_MEDIUM_ORG]: 'Medium Org',
        [process.env.STRIPE_PRICE_ENTERPRISE]: 'Enterprise',
      };
      const planName = priceIdMap[subscription.items.data[0].price.id] || 'Individual';
      
      await emailService.sendPaymentReceiptEmail(
        user.email,
        user.name,
        invoice.amount_paid / 100,
        invoice.currency.toUpperCase(),
        planName
      );
      console.log('📧 Payment receipt sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send payment receipt:', emailError.message);
    }

  } catch (error) {
    console.error('❌ Error handling payment_succeeded:', error);
  }
};

/**
 * Handle invoice.payment_failed
 * Called when a payment fails (card declined, insufficient funds, etc.)
 * THIS IS CRITICAL FOR HANDLING FAILED RENEWALS!
 */
const handlePaymentFailed = async (invoice) => {
  console.log('❌ Processing payment_failed:', invoice.id);

  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customerId }
    });

    if (!user) {
      console.log('⚠️ User not found for customer:', customerId);
      return;
    }

    // Update subscription status to past_due
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      }
    });

    console.log('⚠️ Payment failed for user:', user.email);
    console.log('   Reason:', invoice.last_payment_error?.message || 'Unknown');
    console.log('   Amount:', invoice.amount_due / 100, invoice.currency.toUpperCase());

    // Send payment failed email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendPaymentFailedEmail(
        user.email,
        user.name,
        invoice.amount_due / 100,
        invoice.currency.toUpperCase(),
        invoice.last_payment_error?.message || 'Unknown'
      );
      console.log('📧 Payment failure notice sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send payment failure email:', emailError.message);
    }

  } catch (error) {
    console.error('❌ Error handling payment_failed:', error);
  }
};

/**
 * Handle customer.updated
 * Called when customer details are updated (email, payment method, etc.)
 */
const handleCustomerUpdated = async (customer) => {
  console.log('👤 Processing customer.updated:', customer.id);

  try {
    const user = await prisma.user.findUnique({
      where: { stripeCustomerId: customer.id }
    });

    if (!user) {
      console.log('⚠️ User not found for customer:', customer.id);
      return;
    }

    // You can update user email if it changed in Stripe
    if (customer.email && customer.email !== user.email) {
      console.log('📧 Customer email changed:', user.email, '→', customer.email);
      // Optionally update user email
      // Be careful with this - might want manual verification
    }

    console.log('✅ Customer updated for user:', user.email);
  } catch (error) {
    console.error('❌ Error handling customer.updated:', error);
  }
};

module.exports = {
  handleStripeWebhook,
};