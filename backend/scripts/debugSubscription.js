// ============================================
// 🔍 DEBUG SUBSCRIPTION ISSUE
// Run this to see EXACTLY what's in the database
// Location: backend/scripts/debugSubscription.js
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSubscription() {
  console.log('🔍 DEBUGGING SUBSCRIPTION ISSUE\n');
  console.log('=' .repeat(60));

  const EMAIL = 'jacqueline@magicstarfish.com.au';

  try {
    // STEP 1: Find user with ALL fields
    console.log('\n📋 STEP 1: Checking database for user:', EMAIL);
    console.log('-'.repeat(60));
    
    const user = await prisma.user.findUnique({
      where: { email: EMAIL }
    });

    if (!user) {
      console.error('❌ USER NOT FOUND IN DATABASE!');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ User found in database!\n');
    console.log('USER DATA:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   Created:', user.createdAt);
    
    console.log('\n💳 STRIPE DATA:');
    console.log('   stripeCustomerId:', user.stripeCustomerId || '❌ NULL/MISSING');
    console.log('   subscriptionId:', user.subscriptionId || '❌ NULL/MISSING');
    console.log('   subscriptionStatus:', user.subscriptionStatus || '❌ NULL/MISSING');
    console.log('   priceId:', user.priceId || '❌ NULL/MISSING');
    console.log('   currentPeriodStart:', user.currentPeriodStart || '❌ NULL/MISSING');
    console.log('   currentPeriodEnd:', user.currentPeriodEnd || '❌ NULL/MISSING');

    // STEP 2: Check what the controller would receive
    console.log('\n🔍 STEP 2: Simulating controller SELECT query');
    console.log('-'.repeat(60));
    
    const controllerUser = await prisma.user.findUnique({
      where: { id: user.id },
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

    console.log('CONTROLLER WOULD SEE:');
    console.log('   stripeCustomerId:', controllerUser.stripeCustomerId || '❌ NULL');
    console.log('   subscriptionId:', controllerUser.subscriptionId || '❌ NULL');
    console.log('   subscriptionStatus:', controllerUser.subscriptionStatus || '❌ NULL');
    
    // STEP 3: Analyze the issue
    console.log('\n🔬 STEP 3: Issue Analysis');
    console.log('-'.repeat(60));

    const issues = [];
    
    if (!controllerUser.stripeCustomerId) {
      issues.push('❌ stripeCustomerId is NULL in database');
    }
    
    if (!controllerUser.subscriptionId) {
      issues.push('❌ subscriptionId is NULL in database');
    }
    
    if (!controllerUser.subscriptionStatus) {
      issues.push('❌ subscriptionStatus is NULL in database');
    } else if (controllerUser.subscriptionStatus === 'canceled' || controllerUser.subscriptionStatus === 'incomplete') {
      issues.push('⚠️ subscriptionStatus is: ' + controllerUser.subscriptionStatus);
    }

    if (issues.length > 0) {
      console.log('\n🔴 PROBLEMS FOUND:');
      issues.forEach(issue => console.log('   ' + issue));
      
      console.log('\n💡 SOLUTION:');
      console.log('   The fixExistingSubscriber.js script needs to run again OR');
      console.log('   The database update failed.');
      console.log('\n   Run this command:');
      console.log('   node scripts/fixExistingSubscriber.js');
    } else {
      console.log('✅ No issues found! Database has all required data.');
      console.log('\n💡 If still getting error, the issue is:');
      console.log('   1. Wrong userId in JWT token');
      console.log('   2. Frontend sending wrong data');
      console.log('   3. Cache issue - restart backend server');
    }

    // STEP 4: Check JWT token simulation
    console.log('\n🔑 STEP 4: JWT Token Check');
    console.log('-'.repeat(60));
    console.log('When user signs in, JWT should contain:');
    console.log('   userId:', user.id);
    console.log('   email:', user.email);
    console.log('   role:', user.role);
    console.log('\nController receives: req.user.userId =', user.id);

    // STEP 5: Test the controller logic
    console.log('\n🧪 STEP 5: Testing Controller Logic');
    console.log('-'.repeat(60));
    
    console.log('Controller checks:');
    console.log('   1. User exists?', '✅ YES');
    console.log('   2. stripeCustomerId exists?', controllerUser.stripeCustomerId ? '✅ YES' : '❌ NO - FAILS HERE!');
    console.log('   3. subscriptionId exists?', controllerUser.subscriptionId ? '✅ YES' : '❌ NO - FAILS HERE!');
    console.log('   4. Status valid?', (controllerUser.subscriptionStatus && controllerUser.subscriptionStatus !== 'canceled' && controllerUser.subscriptionStatus !== 'incomplete') ? '✅ YES' : '❌ NO - FAILS HERE!');

    // STEP 6: Check Stripe directly
    if (controllerUser.stripeCustomerId && controllerUser.subscriptionId) {
      console.log('\n☁️ STEP 6: Checking Stripe (optional)');
      console.log('-'.repeat(60));
      console.log('To verify in Stripe Dashboard:');
      console.log('   Customer ID:', controllerUser.stripeCustomerId);
      console.log('   Subscription ID:', controllerUser.subscriptionId);
      console.log('   Check: https://dashboard.stripe.com/customers/' + controllerUser.stripeCustomerId);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ DEBUG COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('   Message:', error.message);
    if (error.code) console.error('   Code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugSubscription()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });