require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const teamRoutes = require('./routes/teamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const adminRoutes = require('./routes/adminRoutes');
const advancedAnalyticsRoutes = require('./routes/advancedAnalyticsRoutes');

// ✨ Enterprise feature routes
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const securityRoutes = require('./routes/securityRoutes');
const whiteLabelRoutes = require('./routes/whiteLabelRoutes');
const integrationsRoutes = require('./routes/integrationsRoutes');
const platformRoutes = require('./routes/platformIntegrationRoutes');

// 🔍 DEBUG ROUTES
const debugRoutes = require('./routes/debugRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════
// 🛡️ PROTECTION SYSTEM - PREVENTS 24-HOUR TIMEOUT
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

// 2. Graceful Shutdown
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

// CORS configuration - Allow web app AND mobile app
const allowedOrigins = [
  process.env.FRONTEND_URL,      // Web app (https://outboundimpact.net)
  'https://localhost',            // Capacitor Android
  'capacitor://localhost',        // Capacitor alternative format
  'http://localhost:5173',        // Local development
  'http://localhost:5000'         // Local backend testing
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

// Body parser middleware with increased limit for file uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Set timeout for all routes (especially for file uploads)
app.use((req, res, next) => {
  if (req.path.includes('/upload')) {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// ═══════════════════════════════════════════════
// 🛣️ API ROUTES
// ═══════════════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/advanced-analytics', advancedAnalyticsRoutes);

// ✨ Enterprise feature routes
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/white-label', whiteLabelRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/platforms', platformRoutes);

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
    console.log('───────────────────────────────────────────────');
    console.log('✨ Enterprise features enabled!');
    console.log('🛍️ Multi-platform e-commerce integration ready!');
    console.log('🔍 Debug routes active at /api/debug');
    console.log('═══════════════════════════════════════════════\n');
  });
}