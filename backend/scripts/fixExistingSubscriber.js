// ============================================
// 🔧 FIX EXISTING SUBSCRIBER - WITHOUT subscriptionPlan
// Run this ONCE to fix the existing subscribed user
// Location: backend/scripts/fixExistingSubscriber.js
// ============================================

/**
 * This script will:
 * 1. Find the user by email
 * 2. Get their subscription from Stripe
 * 3. Update the user record with all missing Stripe data
 */

// ✅ Use proper relative paths from scripts folder
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function fixExistingSubscriber() {
  console.log('🔧 Starting fix for existing subscriber...\n');

  const EMAIL = 'jacqueline@magicstarfish.com.au'; // ← The subscribed user
  const STRIPE_CUSTOMER_ID = 'cus_TiX4l3L3FBtE7o'; // ← From your logs
  const STRIPE_SUBSCRIPTION_ID = 'sub_1Sl60Y2ZJE05xuGtqo7bVDSA'; // ← From your logs

  try {
    // STEP 1: Find the user
    console.log('👤 Finding user:', EMAIL);
    const user = await prisma.user.findUnique({
      where: { email: EMAIL }
    });

    if (!user) {
      console.error('❌ User not found!');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   User ID:', user.id);
    console.log('   Current stripeCustomerId:', user.stripeCustomerId || 'NOT SET');
    console.log('   Current subscriptionId:', user.subscriptionId || 'NOT SET');
    console.log('   Current subscriptionStatus:', user.subscriptionStatus || 'NOT SET');

    // STEP 2: Get subscription from Stripe
    console.log('\n📋 Fetching subscription from Stripe...');
    const subscription = await stripe.subscriptions.retrieve(STRIPE_SUBSCRIPTION_ID);
    const priceId = subscription.items.data[0].price.id;

    console.log('✅ Subscription found:');
    console.log('   Subscription ID:', subscription.id);
    console.log('   Status:', subscription.status);
    console.log('   Price ID:', priceId);
    console.log('   Current Period Start:', new Date(subscription.current_period_start * 1000));
    console.log('   Current Period End:', new Date(subscription.current_period_end * 1000));
    console.log('   Cancel at Period End:', subscription.cancel_at_period_end);

    // Determine plan name from price ID (for logging only)
    const priceIdMap = {
      [process.env.STRIPE_PRICE_INDIVIDUAL]: 'Individual',
      [process.env.STRIPE_PRICE_SMALL_ORG]: 'Small Org',
      [process.env.STRIPE_PRICE_MEDIUM_ORG]: 'Medium Org',
      [process.env.STRIPE_PRICE_ENTERPRISE]: 'Enterprise',
    };
    
    const planName = priceIdMap[priceId] || 'Small Org';
    console.log('   Detected Plan (not saved to DB):', planName);

    // STEP 3: Update user with all Stripe data
    // ✅ REMOVED subscriptionPlan field (not in schema)
    console.log('\n💾 Updating user record...');
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: STRIPE_CUSTOMER_ID,
        subscriptionId: STRIPE_SUBSCRIPTION_ID,
        subscriptionStatus: subscription.status,
        priceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      }
    });

    console.log('✅ User updated successfully!');
    console.log('\n📊 UPDATED USER DATA:');
    console.log('   Email:', updatedUser.email);
    console.log('   Stripe Customer ID:', updatedUser.stripeCustomerId);
    console.log('   Subscription ID:', updatedUser.subscriptionId);
    console.log('   Subscription Status:', updatedUser.subscriptionStatus);
    console.log('   Price ID:', updatedUser.priceId);
    console.log('   Current Period Start:', updatedUser.currentPeriodStart);
    console.log('   Current Period End:', updatedUser.currentPeriodEnd);

    console.log('\n✅ FIX COMPLETED SUCCESSFULLY!');
    console.log('\n🎉 The user can now:');
    console.log('   ✅ Toggle auto-renewal');
    console.log('   ✅ Cancel subscription');
    console.log('   ✅ See subscription details in dashboard');
    console.log('   ✅ Receive future renewal emails');
    console.log('\n💡 Note: Plan name is determined from priceId in your frontend/backend logic');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('\nError Details:');
    console.error('   Message:', error.message);
    if (error.code) console.error('   Code:', error.code);
  } finally {
    await prisma.$disconnect();
    console.log('\n👋 Disconnected from database');
  }
}

// Run the fix
fixExistingSubscriber()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });