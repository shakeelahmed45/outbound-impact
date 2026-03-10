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
const { getPublicStats } = require('./controllers/publicStatsController');


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

// 🔄 Refund routes (NEW)
// const refundRoutes = require('./routes/refundRoutes'); //

// 🔍 DEBUG ROUTES
const debugRoutes = require('./routes/debugRoutes');

// 🎯 STRIPE WEBHOOK CONTROLLER
const webhookController = require('./controllers/webhookController');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════
// 🛡️ PROTECTION SYSTEMS - PREVENTS 24-HOUR TIMEOUT
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// 📡 EXPRESS CONFIGURATION
// ═══════════════════════════════════════════════

// ✅ FIXED: CORS configuration - Allow web app AND mobile app
const allowedOrigins = [
  'https://outboundimpact.net',           // Main domain
  'https://www.outboundimpact.net',       // WWW subdomain
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

// ═══════════════════════════════════════════════
// 🎯 STRIPE WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════
// ⚠️ CRITICAL: This MUST come BEFORE express.json()
// Stripe webhooks need the raw body to verify signatures

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);

// ═══════════════════════════════════════════════
// 📦 BODY PARSER MIDDLEWARE
// ═══════════════════════════════════════════════
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
app.get('/api/public/stats', getPublicStats);
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

// ═══════════════════════════════════════════════
// 🛣️ API ROUTES
// ═══════════════════════════════════════════════

// 📋 Audit middleware — auto-logs all successful write operations
app.use(auditMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/push', pushRoutes);



// ✅ FIXED: teamInvitationRoutes MUST come BEFORE teamRoutes
// Both have /invitation/:token route - admin uses AdminInvitation table, regular uses TeamMember table
app.use('/api/team', teamInvitationRoutes);  // ✅ FIRST - Admin invitations (AdminInvitation table)
app.use('/api/team', teamRoutes);             // ✅ SECOND - Regular team (TeamMember table)
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

// ═══════════════════════════════════════════════
// 🚀 SERVER STARTUP
// ═══════════════════════════════════════════════

// Export for Vercel serverless function
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start server for local development
  chatAutoCloseService.startAutoCloseJob();
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
    console.log('👥 Admin team management enabled!');  // 🆕 NEW
    console.log('═══════════════════════════════════════════════\n');
  });
}