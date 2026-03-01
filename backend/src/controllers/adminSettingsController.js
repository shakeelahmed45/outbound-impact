const prisma = require('../lib/prisma');
const { clearCache, getCurrencySymbol, CURRENCY_SYMBOLS } = require('../services/settingsHelper');
const { fetchRates } = require('../services/exchangeRateService');

// ═══════════════════════════════════════════════════════════
// GET SETTINGS (admin only)
// ═══════════════════════════════════════════════════════════
const getSettings = async (req, res) => {
  try {
    let settings;
    try {
      const rows = await prisma.$queryRaw`SELECT * FROM "PlatformSetting" WHERE "id" = 'default' LIMIT 1`;
      settings = rows[0] || null;
    } catch (e) { settings = null; }

    if (!settings) {
      return res.json({
        status: 'success',
        settings: {
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
        }
      });
    }
    res.json({ status: 'success', settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch settings' });
  }
};

// ═══════════════════════════════════════════════════════════
// UPDATE SETTINGS (admin only)
// ═══════════════════════════════════════════════════════════
const updateSettings = async (req, res) => {
  try {
    const data = req.body;

    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "PlatformSetting" (
          "id" TEXT NOT NULL DEFAULT 'default',
          "platformName" TEXT NOT NULL DEFAULT 'Outbound Impact',
          "supportEmail" TEXT NOT NULL DEFAULT 'support@outboundimpact.org',
          "currency" TEXT NOT NULL DEFAULT 'AUD',
          "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
          "allowRegistrations" BOOLEAN NOT NULL DEFAULT true,
          "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
          "defaultUserRole" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
          "notifyNewCustomer" BOOLEAN NOT NULL DEFAULT true,
          "notifyRevenueMilestone" BOOLEAN NOT NULL DEFAULT true,
          "notifySystemAlerts" BOOLEAN NOT NULL DEFAULT true,
          "notifyWeeklyReports" BOOLEAN NOT NULL DEFAULT false,
          "webhookUrl" TEXT,
          "twoFactorRequired" BOOLEAN NOT NULL DEFAULT false,
          "loginAttemptLimit" BOOLEAN NOT NULL DEFAULT true,
          "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30,
          "autoBackups" BOOLEAN NOT NULL DEFAULT true,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
        )
      `;
    } catch (e) { /* table already exists */ }

    await prisma.$executeRaw`
      INSERT INTO "PlatformSetting" ("id", "platformName", "supportEmail", "currency", "maintenanceMode",
        "allowRegistrations", "requireEmailVerification", "defaultUserRole",
        "notifyNewCustomer", "notifyRevenueMilestone", "notifySystemAlerts", "notifyWeeklyReports",
        "webhookUrl", "twoFactorRequired", "loginAttemptLimit", "sessionTimeoutMinutes", "autoBackups", "updatedAt")
      VALUES ('default',
        ${data.platformName || 'Outbound Impact'},
        ${data.supportEmail || 'support@outboundimpact.org'},
        ${data.currency || 'AUD'},
        ${data.maintenanceMode || false},
        ${data.allowRegistrations !== false},
        ${data.requireEmailVerification || false},
        ${data.defaultUserRole || 'INDIVIDUAL'},
        ${data.notifyNewCustomer !== false},
        ${data.notifyRevenueMilestone !== false},
        ${data.notifySystemAlerts !== false},
        ${data.notifyWeeklyReports || false},
        ${data.webhookUrl || ''},
        ${data.twoFactorRequired || false},
        ${data.loginAttemptLimit !== false},
        ${parseInt(data.sessionTimeoutMinutes) || 30},
        ${data.autoBackups !== false},
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "platformName" = EXCLUDED."platformName",
        "supportEmail" = EXCLUDED."supportEmail",
        "currency" = EXCLUDED."currency",
        "maintenanceMode" = EXCLUDED."maintenanceMode",
        "allowRegistrations" = EXCLUDED."allowRegistrations",
        "requireEmailVerification" = EXCLUDED."requireEmailVerification",
        "defaultUserRole" = EXCLUDED."defaultUserRole",
        "notifyNewCustomer" = EXCLUDED."notifyNewCustomer",
        "notifyRevenueMilestone" = EXCLUDED."notifyRevenueMilestone",
        "notifySystemAlerts" = EXCLUDED."notifySystemAlerts",
        "notifyWeeklyReports" = EXCLUDED."notifyWeeklyReports",
        "webhookUrl" = EXCLUDED."webhookUrl",
        "twoFactorRequired" = EXCLUDED."twoFactorRequired",
        "loginAttemptLimit" = EXCLUDED."loginAttemptLimit",
        "sessionTimeoutMinutes" = EXCLUDED."sessionTimeoutMinutes",
        "autoBackups" = EXCLUDED."autoBackups",
        "updatedAt" = NOW()
    `;

    // Clear settings cache so changes take effect immediately
    clearCache();

    const rows = await prisma.$queryRaw`SELECT * FROM "PlatformSetting" WHERE "id" = 'default' LIMIT 1`;
    res.json({ status: 'success', message: 'Settings saved successfully', settings: rows[0] });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save settings' });
  }
};

// ═══════════════════════════════════════════════════════════
// PUBLIC SETTINGS (no auth — frontend needs currency + name)
// ═══════════════════════════════════════════════════════════
const getPublicSettings = async (req, res) => {
  try {
    let settings;
    try {
      const rows = await prisma.$queryRaw`SELECT "platformName", "currency", "supportEmail" FROM "PlatformSetting" WHERE "id" = 'default' LIMIT 1`;
      settings = rows[0] || null;
    } catch (e) { settings = null; }

    const currency = settings?.currency || 'AUD';

    // Fetch live exchange rates (cached 1 hour on backend)
    let exchangeRate = 1;
    try {
      const rates = await fetchRates();
      exchangeRate = rates[currency] || 1;
    } catch (e) {
      console.error('⚠️ Exchange rate fetch failed:', e.message);
    }

    res.json({
      status: 'success',
      platformName: settings?.platformName || 'Outbound Impact',
      currency,
      currencySymbol: getCurrencySymbol(currency),
      supportEmail: settings?.supportEmail || 'support@outboundimpact.org',
      currencies: CURRENCY_SYMBOLS,
      baseCurrency: 'USD',
      exchangeRate    // e.g. 1.58 for AUD, 278.5 for PKR — frontend multiplies USD amounts by this
    });
  } catch (error) {
    res.json({
      status: 'success',
      platformName: 'Outbound Impact',
      currency: 'AUD',
      currencySymbol: 'A$',
      supportEmail: 'support@outboundimpact.org',
      currencies: CURRENCY_SYMBOLS,
      baseCurrency: 'USD',
      exchangeRate: 1
    });
  }
};

module.exports = { getSettings, updateSettings, getPublicSettings };