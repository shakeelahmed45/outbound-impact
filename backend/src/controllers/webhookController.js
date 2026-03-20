const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { notifyAdminCancellation, notifyAdmins } = require('../services/adminNotificationService');

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
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
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

/**
 * Handle storage add-on one-time payment
 * Called from handleCheckoutCompleted when metadata.type === 'storage_addon'
 */
const handleStorageAddonCompleted = async (session) => {
  console.log('💾 Processing storage_addon checkout:', session.id);

  const { userId, addedGB, addedBytes } = session.metadata || {};
  if (!userId || !addedBytes) {
    console.error('❌ Missing metadata in storage_addon session:', session.metadata);
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { console.error('❌ User not found for storage addon:', userId); return; }

    const currentLimit = Number(user.storageLimit || 2147483648);
    const newLimit     = currentLimit + Number(addedBytes);

    await prisma.user.update({
      where: { id: userId },
      data:  { storageLimit: BigInt(newLimit) },
    });

    console.log(`✅ Storage increased: ${user.email} → +${addedGB}GB (new limit: ${(newLimit / 1024 / 1024 / 1024).toFixed(0)}GB)`);

    const formatBytes = (b) => {
      const k = 1024, sizes = ['Bytes','KB','MB','GB','TB'];
      const i = Math.floor(Math.log(b) / Math.log(k));
      return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // In-app notification
    const { createNotification } = require('../services/notificationService');
    await createNotification(userId, {
      type:     'success',
      category: 'storage',
      title:    `✅ ${addedGB}GB Storage Added!`,
      message:  `Your storage has been expanded. New total: ${formatBytes(newLimit)}.`,
      metadata: { addedGB: Number(addedGB), newLimit: newLimit.toString() },
    });

    // Confirmation email
    const amount   = session.amount_total ? (session.amount_total / 100).toFixed(2) : null;
    const currency = (session.currency || 'aud').toUpperCase();
    const { sendStorageConfirmationEmail } = require('../services/storageEmailTemplates');
    await sendStorageConfirmationEmail({
      email:                  user.email,
      name:                   user.name,
      type:                   'addon',
      addedGB:                Number(addedGB),
      newStorageLimitFormatted: formatBytes(newLimit),
      amountCharged:          amount,
      currency,
    });

    console.log('✅ Storage addon fully processed for:', user.email);
  } catch (err) {
    console.error('❌ handleStorageAddonCompleted error:', err.message);
  }
};

/**
 * ✅ COMPLETE FIX: Handle checkout.session.completed
 * Handles BOTH new signups AND existing user subscriptions
 * WITH EMAIL DELAYS to respect Resend rate limits
 */
const handleCheckoutCompleted = async (session) => {
  console.log('💳 Processing checkout.session.completed:', session.id);

  // ── STORAGE ADD-ON: early-exit branch ─────────────────────
  if (session.metadata?.type === 'storage_addon') {
    await handleStorageAddonCompleted(session);
    return;
  }
  // ──────────────────────────────────────────────────────────

  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  console.log('📧 Customer Email:', customerEmail);
  console.log('👤 Customer ID:', customerId);
  console.log('📋 Subscription ID:', subscriptionId);
  console.log('💰 Amount Total:', session.amount_total);

  if (!customerEmail) {
    console.error('❌ No customer email in checkout session!');
    return;
  }

  try {
    const normalizedEmail = customerEmail.toLowerCase().trim();

    // ✅ STEP 1: Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // ✅ STEP 2: If user doesn't exist, check for pending signup or enterprise lead
    if (!user) {
      console.log('👤 User not found, checking for pending signup or enterprise lead...');

      const sessionMeta = session.metadata || {};

      // ── Enterprise lead checkout (no signup form needed) ─────
      if (sessionMeta.leadId) {
        console.log('🏢 Enterprise lead checkout in webhook, leadId:', sessionMeta.leadId);

        let leadName = 'Enterprise Customer';
        let leadPasswordHash = null;
        try {
          const lead = await prisma.enterpriseLead.findUnique({
            where: { id: sessionMeta.leadId },
            select: { name: true, signupPasswordHash: true }
          });
          if (lead) {
            leadName = lead.name;
            leadPasswordHash = lead.signupPasswordHash;
          }
        } catch (e) { console.error('⚠️ Could not fetch lead data:', e.message); }

        const storageGB    = parseInt(sessionMeta.storageGB) || 1500;
        const storageLimit = BigInt(storageGB) * BigInt(1024 * 1024 * 1024);

        let subscriptionData = {};
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionData = {
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd:   new Date(sub.current_period_end   * 1000),
            priceId:            sub.items.data[0].price.id,
          };
        }

        // Use saved hashed password from signup form — or generate a temp one
        // if the prospect somehow didn't go through the signup form
        let passwordToUse = leadPasswordHash;
        if (!passwordToUse) {
          const crypto2   = require('crypto');
          const bcryptLib = require('bcryptjs');
          passwordToUse   = await bcryptLib.hash(crypto2.randomBytes(16).toString('hex'), 10);
        }

        user = await prisma.user.create({
          data: {
            email:              normalizedEmail,
            name:               leadName,
            password:           passwordToUse,
            role:               'ORG_ENTERPRISE',
            storageLimit,
            stripeCustomerId:   customerId,
            subscriptionId:     subscriptionId || null,
            subscriptionStatus: 'active',
            emailVerified:      true,
            ...subscriptionData,
          }
        });

        // Mark lead converted
        try {
          await prisma.enterpriseLead.update({
            where: { id: sessionMeta.leadId },
            data:  { status: 'converted' }
          });
        } catch (e) {}

        console.log('✅ Enterprise user created from webhook:', user.email);

        // Send welcome email only — user already set password via signup form
        setImmediate(async () => {
          try {
            const emailService = require('../services/emailService');
            await emailService.sendWelcomeEmail(user.email, user.name, 'ORG_ENTERPRISE');
            console.log('✅ Enterprise welcome email sent to:', user.email);
          } catch (e) {
            console.error('⚠️ Enterprise welcome email error:', e.message);
          }
        });

      // ── Normal signup flow (pendingSignups entry exists) ──────
      } else {
        const signupData = global.pendingSignups?.[session.id];

        if (!signupData) {
          console.error('❌ No pending signup data found for session:', session.id);
          console.error('❌ User must register before subscribing!');
          return;
        }

        console.log('✅ Found pending signup data, creating user...');

        let subscriptionData = {};
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionData = {
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            priceId: subscription.items.data[0].price.id,
          };
        }

        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: signupData.name,
            password: signupData.password,
            role: signupData.role,
            storageLimit: signupData.storageLimit,
            stripeCustomerId: customerId,
            subscriptionId: subscriptionId || null,
            subscriptionStatus: 'active',
            emailVerified: true,
            ...subscriptionData,
          }
        });

        console.log('✅ User created successfully:', user.email, 'ID:', user.id);

        delete global.pendingSignups[session.id];
      }
    } else {
      console.log('✅ Found existing user:', user.email, 'ID:', user.id);
    }

    // ✅ STEP 3: Get subscription details and plan name
    let subscription = null;
    let priceId = null;
    let planName = user.role || 'Free';

    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      priceId = subscription.items.data[0].price.id;
      
      const priceIdMap = {
        [process.env.STRIPE_INDIVIDUAL_PRICE]: 'Personal Single Use',
        [process.env.STRIPE_PERSONAL_LIFE_PRICE]: 'Personal Life Events',
        [process.env.STRIPE_ORG_EVENTS_PRICE]: 'Org Events',
        [process.env.STRIPE_SMALL_ORG_PRICE]: 'Starter',
        [process.env.STRIPE_MEDIUM_ORG_PRICE]: 'Growth',
        [process.env.STRIPE_SCALE_ORG_PRICE]: 'Pro',
        [process.env.STRIPE_ENTERPRISE_PRICE]: 'Enterprise',
      };
      
      planName = priceIdMap[priceId] || user.role || 'Individual';
      console.log('📦 Plan:', planName);
    }

    // ✅ STEP 4: Update user with Stripe details
    const updateData = {
      stripeCustomerId: customerId,
    };

    if (subscription) {
      updateData.subscriptionId = subscriptionId;
      updateData.subscriptionStatus = subscription.status;
      updateData.priceId = priceId;
      updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    }

    // ── ORG_EVENTS: set 1-year expiry from today on initial purchase ──
    if (user.role === 'ORG_EVENTS' && !user.orgEventsExpiresAt) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      updateData.orgEventsExpiresAt = expiresAt;
      console.log('📅 ORG_EVENTS: expiry set to', expiresAt.toISOString());
    }

    // ── ORG_EVENTS renewal: if this is the $65 renewal price, extend by 1 year ──
    if (user.role === 'ORG_EVENTS' && session.amount_total &&
        process.env.STRIPE_ORG_EVENTS_RENEWAL_PRICE &&
        session.metadata?.priceId === process.env.STRIPE_ORG_EVENTS_RENEWAL_PRICE) {
      const currentExpiry = user.orgEventsExpiresAt ? new Date(user.orgEventsExpiresAt) : new Date();
      // Extend from current expiry (not today) so they don't lose time
      currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
      updateData.orgEventsExpiresAt = currentExpiry;
      updateData.subscriptionStatus = 'active';
      console.log('🔄 ORG_EVENTS renewal: extended to', currentExpiry.toISOString());
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

    // ✅ Calculate amount for emails
    const amount = session.amount_total ? (session.amount_total / 100) : 0;
    const currency = session.currency ? session.currency.toUpperCase() : 'USD';
    
    console.log('💵 Amount (converted):', amount, currency);

    // ✅ STEP 5: Send welcome email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendWelcomeEmail(user.email, user.name, planName);
      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError.message);
    }

    // ✅ IMPORTANT: Wait 1 second to respect rate limits (2 emails per second)
    console.log('⏳ Waiting 1 second before next email...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ✅ STEP 6: Send payment receipt email
    try {
      const emailService = require('../services/emailService');
      
      if (amount > 0) {
        await emailService.sendPaymentReceiptEmail(
          user.email,
          user.name,
          amount,
          currency,
          planName
        );
        console.log('✅ Payment receipt sent to:', user.email, '- Amount:', amount, currency);
      } else {
        console.log('⚠️ Skipping receipt email - amount is 0');
      }
    } catch (emailError) {
      console.error('❌ Failed to send payment receipt:', emailError.message);
    }

    // ✅ IMPORTANT: Wait another 1 second before admin notification
    console.log('⏳ Waiting 1 second before admin notification...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ✅ STEP 7: Send admin notification
    try {
      const emailService = require('../services/emailService');
      
      await emailService.sendAdminNotification({
        userEmail: user.email,
        userName: user.name,
        plan: planName,
        amount: amount,
        subscriptionId: subscriptionId,
      });
      console.log('✅ Admin notification sent - Amount:', amount);
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

    const priceIdMap = {
      [process.env.STRIPE_INDIVIDUAL_PRICE]: 'Personal Single Use',
      [process.env.STRIPE_PERSONAL_LIFE_PRICE]: 'Personal Life Events',
      [process.env.STRIPE_ORG_EVENTS_PRICE]: 'Org Events',
      [process.env.STRIPE_SMALL_ORG_PRICE]: 'Starter',
      [process.env.STRIPE_MEDIUM_ORG_PRICE]: 'Growth',
      [process.env.STRIPE_SCALE_ORG_PRICE]: 'Pro',
      [process.env.STRIPE_ENTERPRISE_PRICE]: 'Enterprise',
    };
    
    const planName = priceIdMap[priceId] || 'Individual';

    const updateData = {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      priceId: priceId,
    };

    if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
      updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    }

    if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log('✅ Subscription created for user:', user.email);
  } catch (error) {
    console.error('❌ Error handling subscription.created:', error);
  }
};

/**
 * Handle customer.subscription.updated
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

    const priceIdMap = {
      [process.env.STRIPE_INDIVIDUAL_PRICE]: 'Personal Single Use',
      [process.env.STRIPE_PERSONAL_LIFE_PRICE]: 'Personal Life Events',
      [process.env.STRIPE_ORG_EVENTS_PRICE]: 'Org Events',
      [process.env.STRIPE_SMALL_ORG_PRICE]: 'Starter',
      [process.env.STRIPE_MEDIUM_ORG_PRICE]: 'Growth',
      [process.env.STRIPE_SCALE_ORG_PRICE]: 'Pro',
      [process.env.STRIPE_ENTERPRISE_PRICE]: 'Enterprise',
    };
    
    const planName = priceIdMap[priceId] || 'Individual';

    const updateData = {
      subscriptionStatus: subscription.status,
      priceId: priceId,
    };

    if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
      updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      console.log('   Period Start:', updateData.currentPeriodStart);
    }

    if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      console.log('   Period End:', updateData.currentPeriodEnd);
    }

    if (subscription.cancel_at_period_end) {
      updateData.subscriptionStatus = 'canceling';
      console.log('⚠️ Subscription set to cancel at period end');

      // ─── Notify admins: churn signal ───
      await notifyAdmins({
        type: 'warning',
        category: 'churn',
        title: 'Subscription Canceling',
        message: `${user.name || user.email} (${planName}) set their subscription to cancel at period end.`,
        metadata: { customerName: user.name, customerEmail: user.email, plan: planName },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log('✅ Subscription updated for user:', user.email);
    console.log('   Status:', updateData.subscriptionStatus);
    console.log('   Plan:', planName);
  } catch (error) {
    console.error('❌ Error handling subscription.updated:', error);
  }
};

/**
 * Handle customer.subscription.deleted
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
      }
    });

    console.log('✅ Subscription canceled for user:', user.email);

    try {
      const emailService = require('../services/emailService');
      await emailService.sendCancellationEmail(user.email, user.name);
      console.log('📧 Cancellation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send cancellation email:', emailError.message);
    }

    // ─── Notify admins: subscription cancelled ───
    await notifyAdminCancellation(user.name, user.email, user.role);

  } catch (error) {
    console.error('❌ Error handling subscription.deleted:', error);
  }
};

/**
 * Handle invoice.payment_succeeded
 * ✅ SKIP sending receipt email here since checkout.session.completed already sent it
 */
const handlePaymentSucceeded = async (invoice) => {
  console.log('💰 Processing payment_succeeded:', invoice.id);

  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

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

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const updateData = {
      subscriptionStatus: 'active',
    };

    if (subscription.current_period_start && typeof subscription.current_period_start === 'number') {
      updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    }

    if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    console.log('✅ Payment succeeded for user:', user.email);
    console.log('   Amount:', invoice.amount_paid / 100, invoice.currency.toUpperCase());
    if (updateData.currentPeriodEnd) {
      console.log('   New period end:', updateData.currentPeriodEnd);
    }

    // ✅ ONLY send receipt for RENEWAL payments (not initial payment)
    // Initial payment receipt is already sent by checkout.session.completed
    const isRenewal = invoice.billing_reason === 'subscription_cycle';
    
    if (isRenewal) {
      console.log('📧 Sending renewal receipt...');
      
      try {
        const emailService = require('../services/emailService');
        
        const priceIdMap = {
          [process.env.STRIPE_INDIVIDUAL_PRICE]: 'Personal Single Use',
          [process.env.STRIPE_PERSONAL_LIFE_PRICE]: 'Personal Life Events',
          [process.env.STRIPE_ORG_EVENTS_PRICE]: 'Org Events',
          [process.env.STRIPE_SMALL_ORG_PRICE]: 'Starter',
          [process.env.STRIPE_MEDIUM_ORG_PRICE]: 'Growth',
          [process.env.STRIPE_SCALE_ORG_PRICE]: 'Pro',
          [process.env.STRIPE_ENTERPRISE_PRICE]: 'Enterprise',
        };
        const planName = priceIdMap[subscription.items.data[0].price.id] || 'Individual';
        
        await emailService.sendPaymentReceiptEmail(
          user.email,
          user.name,
          invoice.amount_paid / 100,
          invoice.currency.toUpperCase(),
          planName
        );
        console.log('✅ Renewal receipt sent to:', user.email);
      } catch (emailError) {
        console.error('❌ Failed to send renewal receipt:', emailError.message);
      }
    } else {
      console.log('ℹ️ Skipping receipt email (already sent by checkout.session.completed)');
    }

  } catch (error) {
    console.error('❌ Error handling payment_succeeded:', error);
  }
};

/**
 * Handle invoice.payment_failed
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      }
    });

    console.log('⚠️ Payment failed for user:', user.email);
    console.log('   Reason:', invoice.last_payment_error?.message || 'Unknown');
    console.log('   Amount:', invoice.amount_due / 100, invoice.currency.toUpperCase());

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

    if (customer.email && customer.email !== user.email) {
      console.log('📧 Customer email changed:', user.email, '→', customer.email);
    }

    console.log('✅ Customer updated for user:', user.email);
  } catch (error) {
    console.error('❌ Error handling customer.updated:', error);
  }
};

module.exports = {
  handleStripeWebhook,
};