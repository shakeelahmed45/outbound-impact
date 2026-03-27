const prisma = require('../lib/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { notifyAdminCancellation, notifyAdmins } = require('../services/adminNotificationService');

/**
 * ✅ HELPER: Sync subscription data from Stripe if missing
 * This fixes accounts where webhook failed to populate stripeCustomerId/subscriptionId
 */
const syncSubscriptionDataIfMissing = async (user) => {
  console.log('🔄 Checking if subscription data needs syncing...');
  
  // If both fields exist, no sync needed
  if (user.stripeCustomerId && user.subscriptionId) {
    console.log('✅ Subscription data already exists');
    return user;
  }
  
  // If subscription is not active, don't try to sync
  if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
    console.log('⚠️ Subscription not active, cannot sync');
    return user;
  }
  
  console.log('🔍 Subscription data missing, fetching from Stripe...');
  console.log('   Email:', user.email);
  console.log('   stripeCustomerId:', user.stripeCustomerId || 'MISSING');
  console.log('   subscriptionId:', user.subscriptionId || 'MISSING');
  
  try {
    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });
    
    if (customers.data.length === 0) {
      console.error('❌ No Stripe customer found for email:', user.email);
      return user; // Return original user, let it fail with original error
    }
    
    const customer = customers.data[0];
    console.log('✅ Found Stripe customer:', customer.id);
    
    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });
    
    if (subscriptions.data.length === 0) {
      console.error('❌ No active subscription found for customer:', customer.id);
      return user; // Return original user, let it fail with original error
    }
    
    const subscription = subscriptions.data[0];
    console.log('✅ Found active subscription:', subscription.id);
    
    // Update database with Stripe data
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: customer.id,
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0].price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    });
    
    console.log('✅ Database synced with Stripe data!');
    console.log('   stripeCustomerId:', updatedUser.stripeCustomerId);
    console.log('   subscriptionId:', updatedUser.subscriptionId);
    
    return updatedUser;
    
  } catch (error) {
    console.error('❌ Failed to sync subscription data:', error.message);
    return user; // Return original user, let it fail with original error
  }
};

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

    // Get user with ALL subscription fields
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
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

    // ✅ NEW: Try to sync data if missing
    user = await syncSubscriptionDataIfMissing(user);

    // Check if still missing after sync attempt
    if (!user.stripeCustomerId || !user.subscriptionId) {
      console.error('❌ Missing subscription data after sync attempt:');
      console.error('   stripeCustomerId:', user.stripeCustomerId || 'MISSING');
      console.error('   subscriptionId:', user.subscriptionId || 'MISSING');
      
      return res.status(400).json({
        status: 'error',
        message: 'No active subscription found. Please subscribe to a plan first.'
      });
    }

    // Check subscription status
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
        cancel_at_period_end: !autoRenewal
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
        profilePicture: true,
        subscriptionStatus: true,
        subscriptionId: true,
        stripeCustomerId: true,
        priceId: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        storageUsed: true,
        storageLimit: true,
      }
    });

    // Get memberOf relation to check if team member
    const userWithRelations = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberOf: {
          select: { id: true }
        }
      }
    });

    const isTeamMember = userWithRelations.memberOf && userWithRelations.memberOf.length > 0;

    console.log('✅ User updated:', user.email, '- Status:', updatedUser.subscriptionStatus);
    console.log('   Is team member:', isTeamMember);

    // ─── Notify admins: churn signal when auto-renewal turned OFF ───
    if (!autoRenewal) {
      await notifyAdmins({
        type: 'warning',
        category: 'churn',
        title: 'Auto-Renewal Disabled',
        message: `${updatedUser.name || user.email} turned off auto-renewal. Subscription ends at period end.`,
        metadata: { customerName: updatedUser.name, customerEmail: user.email },
      });
    }

    res.json({
      status: 'success',
      message: autoRenewal 
        ? 'Auto-renewal enabled. Your subscription will continue automatically.' 
        : 'Auto-renewal disabled. Subscription will end on ' + new Date(subscription.current_period_end * 1000).toLocaleDateString(),
      user: {
        ...updatedUser,
        isTeamMember: isTeamMember,
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
 * ✅ IMPROVED: CANCEL SUBSCRIPTION WITH 7-DAY REFUND LOGIC + EDGE CASE FIXES
 * 
 * - Automatically syncs missing subscription data from Stripe before canceling
 * - Within 7 days: Full refund + immediate cancellation
 * - After 7 days: Cancel immediately (no refund)
 * 
 * IMPROVEMENTS:
 * 1. Handles NULL currentPeriodStart (defaults to eligible - benefit of doubt)
 * 2. Uses UTC dates for timezone consistency
 * 3. Separate error handling for refund failures (still cancels even if refund fails)
 */
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🗑️ Canceling subscription for user:', userId);

    // Get user with subscription fields and memberOf relation
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberOf: {
          select: { id: true }
        }
      }
    });

    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // ✅ NEW: Try to sync subscription data from Stripe if missing
    user = await syncSubscriptionDataIfMissing(user);

    // Check for active subscription after sync attempt
    if (!user.stripeCustomerId || !user.subscriptionId) {
      console.error('❌ Missing subscription data after sync attempt:');
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

    // ✅ IMPROVED: Calculate 7-day refund eligibility with edge case handling
    let isRefundEligible = false;
    let daysSinceStart = 999;

    if (!user.currentPeriodStart) {
      // ✅ FIX 1: If no start date, assume new subscription (be generous to user)
      console.warn('⚠️ No currentPeriodStart found - assuming new subscription');
      console.warn('   This should not happen - check webhook/sync logic');
      console.warn('   Defaulting to REFUND ELIGIBLE (benefit of doubt to user)');
      isRefundEligible = true; // Give benefit of doubt
      daysSinceStart = 0;
      
    } else {
      // ✅ FIX 2: Use UTC dates to avoid timezone edge cases
      const subscriptionDate = new Date(user.currentPeriodStart);
      const now = new Date();
      
      // Convert to UTC midnight to avoid timezone issues
      const subscriptionDateUTC = Date.UTC(
        subscriptionDate.getUTCFullYear(),
        subscriptionDate.getUTCMonth(),
        subscriptionDate.getUTCDate()
      );
      
      const nowUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );
      
      const diffTime = nowUTC - subscriptionDateUTC;
      daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      isRefundEligible = daysSinceStart <= 7;
      
      console.log('📅 Subscription age:', daysSinceStart, 'days (UTC calculation)');
      console.log('   Start date:', subscriptionDate.toISOString());
      console.log('   Current date:', now.toISOString());
      console.log('💰 Refund eligible:', isRefundEligible ? 'YES' : 'NO');
    }

    let refundInfo = null;
    let cancellationMessage = '';

    // Cancel subscription immediately in Stripe
    console.log('🗑️ Canceling subscription immediately in Stripe...');
    const canceledSubscription = await stripe.subscriptions.cancel(
      user.subscriptionId
    );

    console.log('✅ Subscription canceled in Stripe:', canceledSubscription.id);

    if (isRefundEligible) {
      // Within 7 days: Process full refund
      console.log('💰 Within 7-day refund window - processing refund');

      const invoices = await stripe.invoices.list({
        subscription: user.subscriptionId,
        limit: 1
      });

      if (invoices.data.length > 0 && invoices.data[0].paid) {
        const invoice = invoices.data[0];
        
        // ✅ FIX 3: Separate error handling for refund failures
        try {
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
            status: 'succeeded'
          };

          cancellationMessage = `Subscription canceled immediately and refund of $${(refund.amount / 100).toFixed(2)} ${refund.currency.toUpperCase()} has been processed. You will see the refund in 5-10 business days.`;
          
        } catch (refundError) {
          // ✅ Still cancel subscription even if refund fails
          console.error('❌ Refund failed:', refundError.message);
          console.error('   Subscription is still canceled');
          console.error('   User should contact support for manual refund');
          
          refundInfo = {
            error: true,
            message: refundError.message,
            status: 'failed'
          };
          
          cancellationMessage = 'Subscription has been canceled successfully. However, the automatic refund could not be processed. Please contact support at support@outboundimpact.org with your subscription details to process the refund manually.';
        }
      } else {
        console.warn('⚠️ No paid invoice found for refund');
        cancellationMessage = 'Subscription canceled successfully. Refund will be processed shortly.';
      }

    } else {
      // After 7 days: Cancel immediately but NO refund
      console.log('⚠️ Past 7-day refund window - no refund processed');
      cancellationMessage = `Subscription has been canceled immediately. No refund is available as the 7-day refund period has passed (${daysSinceStart} days since subscription start).`;
    }

    // Update database to 'canceled' status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'canceled',
      }
    });

    console.log('✅ Database updated - Status: canceled');

    // Send cancellation email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendCancellationEmail(user.email, user.name);
      console.log('📧 Cancellation email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Failed to send cancellation email:', emailError.message);
    }

    // ─── Notify admins: subscription cancelled ───
    await notifyAdminCancellation(user.name, user.email, user.role);

    // Get updated user data with memberOf relation
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberOf: {
          select: { id: true }
        }
      }
    });

    const isTeamMember = updatedUser.memberOf && updatedUser.memberOf.length > 0;

    console.log('✅ Cancellation complete:', user.email);
    console.log('   Updated status:', updatedUser.subscriptionStatus);
    console.log('   Is team member:', isTeamMember);
    console.log('   Refund info:', refundInfo ? 'Included' : 'None');

    res.json({
      status: 'success',
      message: cancellationMessage,
      isRefundEligible: isRefundEligible,
      daysSinceStart: daysSinceStart,
      user: {
        ...updatedUser,
        isTeamMember: isTeamMember,
        memberOf: undefined,
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
 */
const reactivateSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🔄 Reactivating subscription for user:', userId);

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

    if (user.subscriptionStatus !== 'canceled') {
      console.error('❌ Subscription not canceled:', user.subscriptionStatus);
      return res.status(400).json({
        status: 'error',
        message: 'Subscription is not canceled. Current status: ' + user.subscriptionStatus
      });
    }

    let priceId = user.priceId;

    if (!priceId) {
      const roleToPriceMap = {
        'INDIVIDUAL': process.env.STRIPE_INDIVIDUAL_PRICE,
        'PERSONAL_LIFE': process.env.STRIPE_PERSONAL_LIFE_PRICE,
        'ORG_EVENTS': process.env.STRIPE_ORG_EVENTS_PRICE,
        'ORG_SMALL': process.env.STRIPE_SMALL_ORG_PRICE,
        'ORG_MEDIUM': process.env.STRIPE_MEDIUM_ORG_PRICE,
        'ORG_SCALE': process.env.STRIPE_SCALE_ORG_PRICE,
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

/**
 * ✅ CREATE STRIPE BILLING PORTAL SESSION
 * 
 * Opens Stripe's hosted portal where users can:
 * - Update payment method (credit/debit card)
 * - View billing history & invoices
 * - Download receipts
 */
const createBillingPortal = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log('🔗 Creating billing portal session for user:', userId);

    // Get user with subscription data
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Try to sync if missing
    user = await syncSubscriptionDataIfMissing(user);

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        status: 'error',
        message: 'No billing account found. Please subscribe to a plan first.'
      });
    }

    console.log('✅ Creating portal for Stripe customer:', user.stripeCustomerId);

    // Create Stripe Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/settings`,
    });

    console.log('✅ Billing portal session created:', session.url);

    res.json({
      status: 'success',
      portalUrl: session.url,
    });

  } catch (error) {
    console.error('❌ Billing portal error:', error);
    console.error('   Error message:', error.message);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to open billing portal'
    });
  }
};

/**
 * ✅ CREATE INDIVIDUAL (PERSONAL SINGLE USE) RENEWAL CHECKOUT SESSION ($10/year)
 */
/**
 * ✅ CANCEL ONE-TIME PLAN (INDIVIDUAL / ORG_EVENTS)
 * Immediately suspends the account — no subscription to cancel in Stripe.
 * Used when user explicitly requests account cancellation.
 */
const cancelOneTimePlan = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, subscriptionStatus: true },
    });

    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    if (!['INDIVIDUAL', 'ORG_EVENTS'].includes(user.role)) {
      return res.status(400).json({ status: 'error', message: 'This endpoint is only for one-time plans.' });
    }

    // Mark suspended immediately — they are choosing to opt out
    await prisma.user.update({
      where: { id: user.id },
      data:  { subscriptionStatus: 'suspended' },
    });

    console.log(`🔒 One-time plan cancelled & suspended: ${user.email} (${user.role})`);

    // Send cancellation email to user
    try {
      const emailService = require('../services/emailService');
      await emailService.sendCancellationEmail(user.email, user.name);
    } catch (e) { console.error('Cancel email failed:', e.message); }

    // Notify admin
    const { notifyAdmins } = require('../services/adminNotificationService');
    await notifyAdmins({
      type:     'warning',
      category: 'churn',
      title:    'One-Time Plan Cancelled',
      message:  `${user.name} (${user.email}) cancelled their ${user.role === 'INDIVIDUAL' ? 'Personal Single Use' : 'Org Events'} plan. Account suspended.`,
    });

    res.json({ status: 'success', message: 'Your plan has been cancelled and your account has been suspended.' });
  } catch (error) {
    console.error('cancelOneTimePlan error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to cancel plan' });
  }
};

/**
 * ✅ CREATE INDIVIDUAL RENEWAL CHECKOUT SESSION ($10/year)
 */
const createIndividualRenewalSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const renewalPriceId = process.env.STRIPE_INDIVIDUAL_RENEWAL_PRICE;

    if (!renewalPriceId) {
      return res.status(503).json({
        status: 'error',
        message: 'Renewal not configured. Please contact support@outboundimpact.org',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, individualExpiresAt: true },
    });

    if (!user || user.role !== 'INDIVIDUAL') {
      return res.status(403).json({ status: 'error', message: 'This renewal is only for Personal Single Use plans.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           [{ price: renewalPriceId, quantity: 1 }],
      mode:                 'payment',
      customer_email:       user.email,
      success_url:          `${process.env.FRONTEND_URL}/dashboard?renewed=true`,
      cancel_url:           `${process.env.FRONTEND_URL}/dashboard/settings`,
      metadata: {
        userId:   user.id,
        planName: 'INDIVIDUAL',
        priceId:  renewalPriceId,
        type:     'renewal',
      },
    });

    res.json({ status: 'success', checkoutUrl: session.url });
  } catch (error) {
    console.error('createIndividualRenewalSession error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create renewal session' });
  }
};

/**
 * ✅ CREATE ORG EVENTS RENEWAL CHECKOUT SESSION ($65/year)
 */
const createOrgEventsRenewalSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const renewalPriceId = process.env.STRIPE_ORG_EVENTS_RENEWAL_PRICE;

    if (!renewalPriceId) {
      return res.status(503).json({
        status: 'error',
        message: 'Renewal not configured. Please contact support@outboundimpact.org',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, orgEventsExpiresAt: true },
    });

    if (!user || user.role !== 'ORG_EVENTS') {
      return res.status(403).json({ status: 'error', message: 'This renewal is only for Org Events plans.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items:           [{ price: renewalPriceId, quantity: 1 }],
      mode:                 'payment',
      customer_email:       user.email,
      success_url:          `${process.env.FRONTEND_URL}/dashboard?renewed=true`,
      cancel_url:           `${process.env.FRONTEND_URL}/dashboard/settings`,
      metadata: {
        userId:   user.id,
        planName: 'ORG_EVENTS',
        priceId:  renewalPriceId,
        type:     'renewal',
      },
    });

    res.json({ status: 'success', checkoutUrl: session.url });
  } catch (error) {
    console.error('createOrgEventsRenewalSession error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create renewal session' });
  }
};

module.exports = {
  toggleAutoRenewal,
  cancelSubscription,
  reactivateSubscription,
  createBillingPortal,
  createOrgEventsRenewalSession,
  createIndividualRenewalSession,
  cancelOneTimePlan,
};