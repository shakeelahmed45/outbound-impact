const prisma = require('../lib/prisma');
const { createNotification } = require('./notificationService');

// ═══════════════════════════════════════════════════════════
// ADMIN NOTIFICATION SERVICE
// Creates in-app notifications for ALL admin users
// when platform-level events happen.
//
// ✅ FIX: Uses createNotification() (prisma.notification.create)
//    instead of createMany() which SILENTLY FAILS because
//    Prisma's createMany does NOT auto-set @updatedAt fields.
// ═══════════════════════════════════════════════════════════

/**
 * Find all admin user IDs (cached 5 minutes).
 */
let adminIdsCache = { ids: null, time: 0 };
const getAdminIds = async () => {
  if (adminIdsCache.ids && Date.now() - adminIdsCache.time < 5 * 60 * 1000) {
    return adminIdsCache.ids;
  }
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    });
    adminIdsCache = { ids: admins.map(a => a.id), time: Date.now() };
    console.log(`🔔 Admin IDs refreshed: ${adminIdsCache.ids.length} admin(s)`);
    return adminIdsCache.ids;
  } catch (e) {
    console.error('🔔 ❌ Failed to fetch admin IDs:', e.message);
    return [];
  }
};

/**
 * Create a notification for ALL admin users.
 * Uses the proven createNotification() which handles @updatedAt correctly.
 * Non-blocking — catches all errors internally.
 */
const notifyAdmins = async ({ type = 'info', category = 'platform', title, message, metadata = null }) => {
  try {
    if (!title || !message) {
      console.log('🔔 ⚠️ notifyAdmins: skipped (missing title/message)');
      return;
    }

    const adminIds = await getAdminIds();
    if (adminIds.length === 0) {
      console.log('🔔 ⚠️ notifyAdmins: skipped (no admin users found in DB)');
      return;
    }

    // Use createNotification (prisma.create) for each admin — NOT createMany
    let created = 0;
    for (const adminId of adminIds) {
      try {
        await createNotification(adminId, { type, category, title, message, metadata });
        created++;
      } catch (innerErr) {
        console.error(`🔔 ❌ Failed for admin ${adminId}:`, innerErr.message);
      }
    }

    console.log(`🔔 ✅ Admin notification: "${title}" → ${created}/${adminIds.length} admin(s) [${category}]`);
  } catch (error) {
    console.error(`🔔 ❌ notifyAdmins failed: "${title}" →`, error.message);
  }
};

// ═══════════════════════════════════════════════════════════
// PRE-BUILT TEMPLATES
// ═══════════════════════════════════════════════════════════

const notifyAdminNewCustomer = async (customerName, customerEmail, plan) => {
  console.log(`🔔 TRIGGER: new_customer → ${customerName || customerEmail}`);
  return notifyAdmins({
    type: 'success',
    category: 'new_customer',
    title: 'New Customer Signed Up',
    message: `${customerName || customerEmail} signed up with the ${plan || 'Individual'} plan.`,
    metadata: { customerName, customerEmail, plan },
  });
};

const notifyAdminPlanUpgrade = async (customerName, customerEmail, oldPlan, newPlan) => {
  console.log(`🔔 TRIGGER: revenue (upgrade) → ${customerName || customerEmail}`);
  return notifyAdmins({
    type: 'success',
    category: 'revenue',
    title: 'Plan Upgrade',
    message: `${customerName || customerEmail} upgraded from ${oldPlan} to ${newPlan}.`,
    metadata: { customerName, customerEmail, oldPlan, newPlan },
  });
};

const notifyAdminPlanDowngrade = async (customerName, customerEmail, oldPlan, newPlan) => {
  console.log(`🔔 TRIGGER: revenue (downgrade) → ${customerName || customerEmail}`);
  return notifyAdmins({
    type: 'warning',
    category: 'revenue',
    title: 'Plan Downgrade',
    message: `${customerName || customerEmail} downgraded from ${oldPlan} to ${newPlan}.`,
    metadata: { customerName, customerEmail, oldPlan, newPlan },
  });
};

const notifyAdminCancellation = async (customerName, customerEmail, plan) => {
  console.log(`🔔 TRIGGER: churn (cancellation) → ${customerName || customerEmail}`);
  return notifyAdmins({
    type: 'alert',
    category: 'churn',
    title: 'Subscription Cancelled',
    message: `${customerName || customerEmail} cancelled their ${plan || ''} subscription.`.trim(),
    metadata: { customerName, customerEmail, plan },
  });
};

const notifyAdminUserSuspended = async (customerName, customerEmail, reason) => {
  console.log(`🔔 TRIGGER: system (suspended) → ${customerName || customerEmail}`);
  return notifyAdmins({
    type: 'warning',
    category: 'system',
    title: 'User Suspended',
    message: `${customerName || customerEmail} has been suspended. ${reason || ''}`.trim(),
    metadata: { customerName, customerEmail, reason },
  });
};

const notifyAdminUserRestored = async (customerName, customerEmail) => {
  console.log(`🔔 TRIGGER: system (restored) → ${customerName || customerEmail}`);
  return notifyAdmins({
    type: 'info',
    category: 'system',
    title: 'User Restored',
    message: `${customerName || customerEmail} account has been restored.`,
    metadata: { customerName, customerEmail },
  });
};

const notifyAdminCampaignSent = async (campaignName, targetCount, notifCount, emailCount) => {
  console.log(`🔔 TRIGGER: platform (campaign) → "${campaignName}"`);
  return notifyAdmins({
    type: 'success',
    category: 'platform',
    title: 'Campaign Sent',
    message: `"${campaignName}" sent to ${targetCount} users (${notifCount} notifications, ${emailCount} emails).`,
    metadata: { campaignName, targetCount, notifCount, emailCount },
  });
};

const notifyAdminSystemAlert = async (title, message) => {
  console.log(`🔔 TRIGGER: system (alert) → "${title}"`);
  return notifyAdmins({
    type: 'alert',
    category: 'system',
    title,
    message,
  });
};

module.exports = {
  notifyAdmins,
  notifyAdminNewCustomer,
  notifyAdminPlanUpgrade,
  notifyAdminPlanDowngrade,
  notifyAdminCancellation,
  notifyAdminUserSuspended,
  notifyAdminUserRestored,
  notifyAdminCampaignSent,
  notifyAdminSystemAlert,
};