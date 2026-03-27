const prisma = require('../lib/prisma');
const { createNotification } = require('./notificationService');

// Admin email via Resend — lazy-loaded to avoid circular deps
let _resend = null;
const getResend = () => {
  if (!_resend && process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'shakeel@outboundimpact.org';
const FRONTEND    = process.env.FRONTEND_URL || 'https://outboundimpact.net';

// Categories that are important enough to also email the admin
const EMAIL_CATEGORIES = new Set(['churn', 'revenue', 'account', 'system', 'churn_signal']);

// Emoji map for subject lines
const CATEGORY_EMOJI = {
  churn:        '⚠️',
  revenue:      '💰',
  account:      '👤',
  system:       '🔴',
  platform:     '🟣',
  team:         '👥',
  churn_signal: '⚠️',
  new_customer: '🎉',
};

const sendAdminEmail = async ({ type, category, title, message }) => {
  const resend = getResend();
  if (!resend) return; // Resend not configured

  const emoji   = CATEGORY_EMOJI[category] || '🔔';
  const bgColor = type === 'error' ? '#CC3333' : type === 'warning' ? '#FFB020' : '#0B1220';

  const html = `<!DOCTYPE html>
<html><body style="font-family:sans-serif;background:#f0f2f5;padding:30px 20px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.09);">
  <div style="background:${bgColor};padding:22px 30px;">
    <h2 style="color:#fff;margin:0;font-size:17px;">${emoji} ${title}</h2>
    <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:12px;">Outbound Impact Admin · ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
  <div style="padding:24px 30px;">
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">${message}</p>
    <a href="${FRONTEND}/admin" style="display:inline-block;padding:10px 24px;background:linear-gradient(135deg,#7B4FD6,#00C49A);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">View Admin Dashboard →</a>
  </div>
</div></body></html>`;

  await resend.emails.send({
    from:    'Outbound Impact <noreply@outboundimpact.org>',
    to:      [ADMIN_EMAIL],
    subject: `${emoji} [OI Admin] ${title}`,
    html,
  }).catch(e => console.error('🔔 Admin email send failed:', e.message));
};

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

    // ── Bug 4 Fix: Also send email for important categories ──
    if (EMAIL_CATEGORIES.has(category) || type === 'error' || type === 'warning') {
      await sendAdminEmail({ type, category, title, message });
      console.log(`🔔 📧 Admin email sent for: "${title}"`);
    }
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