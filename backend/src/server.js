require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('./lib/prisma');

const pushRoutes = require('./routes/pushRoutes');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const teamRoutes = require('./routes/teamRoutes');
const teamInvitationRoutes = require('./routes/teamInvitationRoutes');  // 🆕 NEW
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const advancedAnalyticsRoutes = require('./routes/advancedAnalyticsRoutes');
const chatAutoCloseService = require('./services/chatAutoCloseService');
const { initializeEnforcementColumns } = require('./services/settingsHelper');
const { getPublicStats, getPublicStatsJS } = require('./controllers/publicStatsController');


// ✨ Enterprise feature routes
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const securityRoutes = require('./routes/securityRoutes');
const whiteLabelRoutes = require('./routes/whiteLabelRoutes');
const integrationsRoutes = require('./routes/integrationsRoutes');
const platformRoutes = require('./routes/platformIntegrationRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const messageRoutes = require('./routes/messageRoutes');
const auditMiddleware = require('./middleware/auditMiddleware');


// 💳 Subscription management routes
const subscriptionRoutes = require('./routes/subscriptionRoutes');

// 🔔 Notification routes
const notificationRoutes = require('./routes/notificationRoutes');
const storageAlertRoutes = require('./routes/storageAlertRoutes');

// 🔄 Refund routes (NEW)
// const refundRoutes = require('./routes/refundRoutes'); //

// 🔍 DEBUG ROUTES
const debugRoutes = require('./routes/debugRoutes');

// 🎯 STRIPE WEBHOOK CONTROLLER
const webhookController = require('./controllers/webhookController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Database Connection Refresh (Every 2 hours)
// Prevents stale connections from causing timeouts
setInterval(async () => {
  try {
    console.log('🔄 Refreshing database connection...');
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await prisma.$connect();
    console.log('✅ Database connection refreshed successfully');
  } catch (error) {
    console.error('❌ Database refresh error:', error.message);
  }
}, 2 * 60 * 60 * 1000); // Every 2 hours

// 2. Connection Pool Cleanup (Every 3 hours)
// Clears stuck/idle connections
setInterval(async () => {
  try {
    console.log('🧹 Cleaning up stuck database connections...');
    await prisma.$executeRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '10 minutes'
        AND pid <> pg_backend_pid();
    `;
    console.log('✅ Connection cleanup completed');
  } catch (error) {
    console.error('⚠️ Connection cleanup error:', error.message);
  }
}, 3 * 60 * 60 * 1000); // Every 3 hours

// 3. Graceful Shutdown
// Proper cleanup on termination
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.options('/api/public/stats', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(204).end();
});
app.get('/api/public/stats', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, max-age=300');
  next();
}, getPublicStats);

// JSONP version — <script> tag, zero CORS issues
app.get('/api/public/stats.js', getPublicStatsJS);

// ✅ FIXED: CORS configuration - Allow web app AND mobile app
const allowedOrigins = [
  'https://outboundimpact.net',           // Main domain
  'https://www.outboundimpact.net',       // WWW subdomain
  'https://outboundimpact.org',           // WordPress marketing site
  'https://www.outboundimpact.org',       // WordPress WWW
  process.env.FRONTEND_URL,               // Environment variable (backup)
  'https://localhost',                    // Capacitor Android
  'capacitor://localhost',                // Capacitor alternative format
  'http://localhost:5173',                // Local development
  'http://localhost:5000',                // Local backend testing
  'http://localhost:3000'                 // Additional local dev
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Stripe webhooks need the raw body to verify signatures

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);

// ⚠️ This comes AFTER the webhook endpoint

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Set timeout for all routes (especially for file uploads)
app.use((req, res, next) => {
  if (req.path.includes('/upload')) {
    req.setTimeout(1800000); // 5 minutes
    res.setTimeout(1800000);
  }
  next();
});

// ═══════════════════════════════════════════════
// 🏥 HEALTH CHECK ENDPOINT
// ═══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  
  res.json({ 
    status: 'success', 
    message: 'Outbound Impact API is running',
    memory: {
      heapTotal: `${heapTotalMB}MB`,
      heapUsed: `${heapUsedMB}MB`,
      usage: `${Math.round((heapUsedMB / heapTotalMB) * 100)}%`
    },
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET
  });
});

// 📋 Audit middleware — auto-logs all successful write operations
app.use(auditMiddleware);

app.get('/og/:slug', async (req, res) => {
  const { slug } = req.params;
  const FRONTEND = process.env.FRONTEND_URL || 'https://outboundimpact.net';

  try {
    const item = await prisma.item.findUnique({
      where: { slug },
      select: {
        title: true, description: true, type: true,
        mediaUrl: true, thumbnailUrl: true,
        sharingEnabled: true, status: true,
        user: { select: { name: true } },
      },
    });

    // Fall back to a generic page if not found / private
    if (!item || !item.sharingEnabled || item.status === 'PENDING_APPROVAL') {
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Outbound Impact</title>
  <meta property="og:title" content="Outbound Impact"/>
  <meta property="og:description" content="Share content. Track analytics. Grow your reach."/>
  <meta property="og:image" content="${FRONTEND}/og-default.png"/>
  <meta property="og:url" content="${FRONTEND}"/>
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0;url=${FRONTEND}/l/${slug}">
</head>
<body></body>
</html>`);
    }

    const pageUrl     = `${FRONTEND}/l/${slug}`;
    const title       = item.title || 'Outbound Impact';
    const description = item.description
      || (item.type === 'VIDEO' ? 'Watch this video on Outbound Impact'
        : item.type === 'AUDIO' ? 'Listen on Outbound Impact'
        : item.type === 'IMAGE' ? 'View this image on Outbound Impact'
        : 'View on Outbound Impact');

    // Best image: thumbnail → mediaUrl for images → dynamic OG card
    const BACKEND = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
      : 'https://outbound-impact-production.up.railway.app';
    const image = item.thumbnailUrl
      || (item.type === 'IMAGE' ? item.mediaUrl : null)
      || `${BACKEND}/api/og-image/${slug}`;

    const ogType = item.type === 'VIDEO' ? 'video.other' : 'website';

    res.set('Cache-Control', 'public, max-age=3600'); // cache 1 hour
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Outbound Impact</title>

  <!-- Primary meta -->
  <meta name="description" content="${escapeHtml(description)}">

  <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
  <meta property="og:type"        content="${ogType}">
  <meta property="og:url"         content="${pageUrl}">
  <meta property="og:title"       content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image"       content="${image}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name"   content="Outbound Impact">

  <!-- Twitter / X card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image"       content="${image}">

  <!-- Redirect real users to the React app immediately -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body>
  <p>Redirecting to <a href="${pageUrl}">${escapeHtml(title)}</a>…</p>
</body>
</html>`);
  } catch (err) {
    console.error('OG endpoint error:', err.message);
    res.redirect(`${FRONTEND}/l/${slug}`);
  }
});

app.get('/og/c/:slug', async (req, res) => {
  const { slug } = req.params;
  const FRONTEND = process.env.FRONTEND_URL || 'https://outboundimpact.net';

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { slug },
      select: {
        name: true, description: true, logoUrl: true,
        user: { select: { name: true } },
        items: { take: 1, select: { thumbnailUrl: true, mediaUrl: true, type: true } },
      },
    });

    if (!campaign) {
      return res.send(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"><title>Outbound Impact</title>
  <meta property="og:title" content="Outbound Impact"/>
  <meta property="og:description" content="Share content. Track analytics. Grow your reach."/>
  <meta property="og:image" content="${FRONTEND}/og-default.png"/>
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0;url=${FRONTEND}/c/${slug}">
</head><body></body></html>`);
    }

    const pageUrl     = `${FRONTEND}/c/${slug}`;
    const title       = campaign.name || 'Outbound Impact';
    const description = campaign.description || `View ${title} on Outbound Impact`;

    // Best image: campaign logo → first item thumbnail → first image item → default
    const BACKEND = process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
      : 'https://outbound-impact-production.up.railway.app';
    let image = campaign.logoUrl;
    if (!image && campaign.items.length > 0) {
      const firstItem = campaign.items[0];
      image = firstItem.thumbnailUrl || (firstItem.type === 'IMAGE' ? firstItem.mediaUrl : null);
    }
    if (!image) image = `${FRONTEND}/og-default.png`;

    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Outbound Impact</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="${pageUrl}">
  <meta property="og:title"       content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image"       content="${image}">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name"   content="Outbound Impact">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image"       content="${image}">
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head><body>
  <p>Redirecting to <a href="${pageUrl}">${escapeHtml(title)}</a>…</p>
</body></html>`);
  } catch (err) {
    console.error('Campaign OG error:', err.message);
    res.redirect(`${FRONTEND}/c/${slug}`);
  }
});

// Helper — prevent XSS in OG HTML output
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

app.get('/api/og-image/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    let sharp;
    try { sharp = require('sharp'); } catch (_) {
      console.warn('⚠️ sharp not installed — run: npm install sharp --save');
      return res.redirect(`${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/og-default.png`);
    }

    const item = await prisma.item.findUnique({
      where: { slug },
      select: { title: true, type: true, description: true, thumbnailUrl: true, mediaUrl: true, user: { select: { name: true } } },
    });

    // If item has a real thumbnail, redirect to it
    if (item?.thumbnailUrl) return res.redirect(item.thumbnailUrl);
    if (item?.type === 'IMAGE' && item?.mediaUrl) return res.redirect(item.mediaUrl);
    if (!item) return res.redirect(`${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/og-default.png`);

    // Type label + icon
    const typeInfo = {
      VIDEO: { label: '▶  Video', color: '#FF4E4E', bg: '#FFF0F0' },
      AUDIO: { label: '♫  Audio', color: '#7B4FD6', bg: '#F5F0FF' },
      TEXT:  { label: '✎  Text',  color: '#00C49A', bg: '#F0FFF8' },
      EMBED: { label: '🔗  Link', color: '#3AABF7', bg: '#F0F8FF' },
    }[item.type] || { label: '📄  Content', color: '#800080', bg: '#FDF0FD' };

    // Truncate title to fit
    const title = (item.title || 'Untitled').substring(0, 60) + (item.title?.length > 60 ? '…' : '');
    const desc = (item.description || '').substring(0, 90) + (item.description?.length > 90 ? '…' : '');
    const author = item.user?.name || 'Outbound Impact';

    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#800080"/>
      <stop offset="50%" style="stop-color:#9B30FF"/>
      <stop offset="100%" style="stop-color:#EE82EE"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF"/>
      <stop offset="100%" style="stop-color:#FAFAFF"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <!-- Card -->
  <rect x="60" y="50" width="1080" height="530" rx="24" fill="url(#card)" opacity="0.97"/>
  <!-- Type badge -->
  <rect x="100" y="90" width="${typeInfo.label.length * 16 + 40}" height="44" rx="22" fill="${typeInfo.bg}"/>
  <text x="120" y="120" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="${typeInfo.color}">${typeInfo.label}</text>
  <!-- Title -->
  <text x="100" y="200" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="#1a1a2e">${escapeHtml(title)}</text>
  <!-- Description -->
  <text x="100" y="270" font-family="Arial,sans-serif" font-size="24" fill="#6B7280">${escapeHtml(desc)}</text>
  <!-- Divider -->
  <line x1="100" y1="340" x2="1100" y2="340" stroke="#E5E7EB" stroke-width="2"/>
  <!-- Author -->
  <circle cx="130" cy="400" r="28" fill="${typeInfo.color}" opacity="0.15"/>
  <text x="130" y="408" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="${typeInfo.color}">${escapeHtml(author.charAt(0).toUpperCase())}</text>
  <text x="175" y="395" font-family="Arial,sans-serif" font-size="20" fill="#6B7280">Shared by</text>
  <text x="175" y="425" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="#1a1a2e">${escapeHtml(author)}</text>
  <!-- Footer branding -->
  <rect x="60" y="480" width="1080" height="100" rx="0" fill="#800080" opacity="0.06"/>
  <text x="600" y="535" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#800080" font-weight="bold">outboundimpact.net</text>
  <text x="600" y="562" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#9CA3AF">Physical connection. Digital depth.</text>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache 24 hours
    res.send(pngBuffer);
  } catch (err) {
    console.error('OG image generation error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'https://outboundimpact.net'}/og-default.png`);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/push', pushRoutes);



// Both have /invitation/:token route - admin uses AdminInvitation table, regular uses TeamMember table
app.use('/api/team', teamInvitationRoutes);  
app.use('/api/team', teamRoutes);             
app.use('/api/team-invitation', teamInvitationRoutes);  // Alternative path for admin panel

app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);
app.use('/api/chat', chatRoutes);

// ✨ Enterprise feature routes
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/platforms', platformRoutes);

// 💳 Subscription management routes
app.use('/api/subscription', subscriptionRoutes);

// 🔔 Notification routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/storage-alerts', storageAlertRoutes);
app.use('/api/enterprise-leads', require('./routes/enterpriseLeadRoutes'));
const cohortRoutes = require('./routes/cohortRoutes');
app.use('/api/cohorts', cohortRoutes);

// 🔄 Refund routes (NEW)
// app.use('/api/refund', refundRoutes); //

// 🔍 DEBUG ROUTES
app.use('/api/debug', debugRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// Export for Vercel serverless function
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start server for local development
  chatAutoCloseService.startAutoCloseJob();
  const { startStorageAlertJob } = require('./services/storageAlertService');
  startStorageAlertJob();
  const { startOrgEventsRenewalCron } = require('./services/orgEventsRenewalService');
  startOrgEventsRenewalCron();

  const { startIndividualRenewalCron } = require('./services/individualRenewalService');
  startIndividualRenewalCron();

  const { startMonthlyRenewalReminderCron } = require('./services/monthlyRenewalReminderService');
  startMonthlyRenewalReminderCron();
  const { checkConfig: checkR2Config } = require('./services/cloudflareService');
  checkR2Config();
  initializeEnforcementColumns().catch(e => console.error('Column init error:', e));
  app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════════════');
    console.log('🚀 Outbound Impact Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('───────────────────────────────────────────────');
    console.log('🛡️ Protection Active:');
    console.log('  ✅ Database refresh (2h)');
    console.log('  ✅ Connection cleanup (3h)');
    console.log('───────────────────────────────────────────────');
    console.log('💳 Stripe Integration:');
    console.log('  ✅ Webhook endpoint: /api/stripe/webhook');
    console.log(`  ${process.env.STRIPE_WEBHOOK_SECRET ? '✅' : '❌'} Webhook secret configured`);
    console.log('───────────────────────────────────────────────');
    console.log('✨ Enterprise features enabled!');
    console.log('💳 Subscription management enabled!');
    console.log('🔄 Refund system enabled! (7-day policy)');
    console.log('🛍️ Multi-platform e-commerce integration ready!');
    console.log('🔍 Debug routes active at /api/debug');
    console.log('👥 Admin team management enabled!');  
    console.log('═══════════════════════════════════════════════\n');
  });
}