const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// SETTINGS CACHE — 30-second TTL avoids DB hit on every request
// ═══════════════════════════════════════════════════════════
let settingsCache = { data: null, lastChecked: 0 };
const CACHE_TTL = 30 * 1000;

const DEFAULTS = {
  platformName: 'Outbound Impact',
  supportEmail: 'support@outboundimpact.org',
  currency: 'AUD',
  maintenanceMode: false,
  allowRegistrations: true,
  requireEmailVerification: false,
  defaultUserRole: 'INDIVIDUAL',
  notifyNewCustomer: true,
  notifyRevenueMilestone: true,
  notifySystemAlerts: true,
  notifyWeeklyReports: false,
  webhookUrl: '',
  twoFactorRequired: false,
  loginAttemptLimit: true,
  sessionTimeoutMinutes: 30,
  autoBackups: true
};

const CURRENCY_SYMBOLS = {
  AUD: 'A$', USD: '$', EUR: '€', GBP: '£',
  PKR: '₨', CAD: 'C$', NZD: 'NZ$'
};

/** Get all platform settings (cached 30s) */
const getSettings = async () => {
  const now = Date.now();
  if (settingsCache.data && (now - settingsCache.lastChecked < CACHE_TTL)) {
    return settingsCache.data;
  }
  try {
    const rows = await prisma.$queryRaw`SELECT * FROM "PlatformSetting" WHERE "id" = 'default' LIMIT 1`;
    const settings = rows[0] ? { ...DEFAULTS, ...rows[0] } : { ...DEFAULTS };
    settingsCache = { data: settings, lastChecked: now };
    return settings;
  } catch (e) {
    settingsCache = { data: { ...DEFAULTS }, lastChecked: now };
    return { ...DEFAULTS };
  }
};

/** Get single setting */
const getSetting = async (key) => {
  const s = await getSettings();
  return s[key] !== undefined ? s[key] : DEFAULTS[key];
};

/** Clear cache (call after admin saves) */
const clearCache = () => {
  settingsCache = { data: null, lastChecked: 0 };
};

/** Get symbol for currency code */
const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code] || '$';

/**
 * Fire webhook if URL configured. Non-blocking — failures logged, never thrown.
 */
const fireWebhook = async (event, payload) => {
  try {
    const settings = await getSettings();
    const url = settings.webhookUrl;
    if (!url) return;

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(5000)
    }).catch(err => console.error(`⚠️ Webhook to ${url} failed:`, err.message));
  } catch (e) {
    console.error('⚠️ Webhook error:', e.message);
  }
};

/**
 * Check whether a specific admin notification type is enabled.
 */
const isNotificationEnabled = async (type) => {
  const settings = await getSettings();
  switch (type) {
    case 'new_customer': return settings.notifyNewCustomer !== false;
    case 'revenue_milestone': return settings.notifyRevenueMilestone !== false;
    case 'system_alert': return settings.notifySystemAlerts !== false;
    case 'weekly_report': return settings.notifyWeeklyReports !== false;
    default: return true;
  }
};

/**
 * Add enforcement columns to User table if missing. Safe to call on every startup.
 */
const initializeEnforcementColumns = async () => {
  const cols = [
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT true`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT`,
  ];
  for (const sql of cols) {
    try { await prisma.$executeRawUnsafe(sql); } catch (e) { /* column already exists */ }
  }
  console.log('✅ Settings enforcement columns ready');
};

module.exports = {
  getSettings, getSetting, clearCache,
  getCurrencySymbol, CURRENCY_SYMBOLS, DEFAULTS,
  fireWebhook, isNotificationEnabled,
  initializeEnforcementColumns
};