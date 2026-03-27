const cron  = require('node-cron');
const prisma = require('../lib/prisma');
const { createNotification } = require('./notificationService');
const { sendStorageWarningEmail } = require('./storageEmailTemplates');

// ── helpers ──────────────────────────────────────────────────

const formatBytes = (bytes) => {
  const n = Number(bytes || 0);
  if (n === 0) return '0 Bytes';
  const k    = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i    = Math.floor(Math.log(n) / Math.log(k));
  return parseFloat((n / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const PLAN_NAMES = {
  INDIVIDUAL:    'Personal Single Use',
  PERSONAL_LIFE: 'Personal Life Events',
  ORG_EVENTS:    'Org Events',
  ORG_SMALL:     'Starter',
  ORG_MEDIUM:    'Growth',
  ORG_SCALE:     'Pro',
  ORG_ENTERPRISE:'Enterprise',
};

// ── core check ────────────────────────────────────────────────

const checkAndAlertUser = async (user) => {
  const storageUsed  = Number(user.storageUsed  || 0);
  const storageLimit = Number(user.storageLimit  || 2147483648);

  if (storageLimit === 0) return;

  const percentUsed = Math.round((storageUsed / storageLimit) * 100);
  if (percentUsed < 80) return;

  const isCritical  = percentUsed >= 95;
  const planName    = PLAN_NAMES[user.role] || user.role;

  // ── DEDUPLICATION: skip if already notified in last 23h ──
  const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
  const recentNotif = await prisma.notification.findFirst({
    where: {
      userId:    user.id,
      category:  'storage',
      createdAt: { gte: twentyThreeHoursAgo },
    },
  });

  if (recentNotif) {
    console.log(`  ⏭  ${user.email} — already notified today, skipping`);
    return;
  }

  const title   = isCritical ? '🚨 Storage Critical!' : '⚠️ Storage Running Low';
  const message = isCritical
    ? `You've used ${percentUsed}% of your storage. Uploads will fail when full — please upgrade or add storage immediately.`
    : `You've used ${percentUsed}% of your storage (${formatBytes(storageUsed)} of ${formatBytes(storageLimit)}). Upgrade your plan or add storage to avoid interruptions.`;

  // ── IN-APP NOTIFICATION ────────────────────────────────────
  await createNotification(user.id, {
    type:     isCritical ? 'alert'   : 'warning',
    category: 'storage',
    title,
    message,
    metadata: {
      percentUsed,
      storageUsed:  storageUsed.toString(),
      storageLimit: storageLimit.toString(),
      planName,
    },
  });

  // ── EMAIL ALERT ────────────────────────────────────────────
  await sendStorageWarningEmail({
    email:                 user.email,
    name:                  user.name,
    percentUsed,
    storageUsedFormatted:  formatBytes(storageUsed),
    storageLimitFormatted: formatBytes(storageLimit),
    currentPlan:           planName,
  });

  console.log(`  ✅ ${user.email} — alerted (${percentUsed}% used)`);
};

// ── main job ─────────────────────────────────────────────────

const runStorageAlertJob = async () => {
  console.log('\n🔔 [Storage Alert Job] Starting…');
  const start = Date.now();

  try {
    // Fetch all active (non-ADMIN, non-CUSTOMER_SUPPORT) users
    // who have storageUsed > 0 (avoids unnecessary math on empty accounts)
    const users = await prisma.user.findMany({
      where: {
        role:       { notIn: ['ADMIN', 'CUSTOMER_SUPPORT'] },
        status:     { not: 'deleted' },
        storageUsed: { gt: BigInt(0) },
      },
      select: {
        id:           true,
        email:        true,
        name:         true,
        role:         true,
        storageUsed:  true,
        storageLimit: true,
      },
    });

    console.log(`🔔 [Storage Alert Job] Checking ${users.length} users…`);

    // Process sequentially to avoid hammering DB + email rate limits
    for (const user of users) {
      try {
        await checkAndAlertUser(user);
        // Small delay to respect Resend's 2/sec rate limit
        await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.error(`  ❌ Failed for ${user.email}:`, err.message);
      }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`🔔 [Storage Alert Job] Done in ${elapsed}s\n`);
  } catch (err) {
    console.error('❌ [Storage Alert Job] Fatal error:', err.message);
  }
};

// ── scheduler ────────────────────────────────────────────────

/**
 * Start the daily storage alert cron job.
 * Schedule: every day at 09:00 UTC  →  cron "0 9 * * *"
 *
 * Call this once from server.js on startup.
 */
const startStorageAlertJob = () => {
  // Run immediately once so you can test on first deploy
  // (comment out the line below in production if not desired)
  // runStorageAlertJob();

  cron.schedule('0 9 * * *', () => {
    runStorageAlertJob();
  }, {
    timezone: 'UTC',
  });

  console.log('🔔 Storage Alert Job scheduled — daily at 09:00 UTC');
};

module.exports = { startStorageAlertJob, runStorageAlertJob };