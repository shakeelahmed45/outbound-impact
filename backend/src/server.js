// 🔧 FORCE MEMORY SETTINGS (Railway doesn't respect NODE_OPTIONS sometimes)
if (process.env.NODE_ENV === 'production') {
  const v8 = require('v8');
  const totalHeap = v8.getHeapStatistics().heap_size_limit;
  const totalHeapInGB = (totalHeap / 1024 / 1024 / 1024).toFixed(2);
  console.log(`📊 Current heap limit: ${totalHeapInGB}GB`);
  
  // Try to enable garbage collection
  try {
    if (!global.gc) {
      require('v8').setFlagsFromString('--expose-gc');
      global.gc = require('vm').runInNewContext('gc');
    }
    console.log('✅ Garbage collection enabled');
  } catch (e) {
    console.log('⚠️ Could not enable GC:', e.message);
  }
}

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
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

// 🔧 Prisma for database management
const prisma = require('./lib/prisma');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow web app AND mobile app
const allowedOrigins = [
  process.env.FRONTEND_URL,      // Web app (https://outboundimpact.net)
  'https://localhost',            // Capacitor Android
  'capacitor://localhost',        // Capacitor alternative format
  'http://localhost:5173',        // Local development
  'http://localhost:5000'         // Local backend testing
].filter(Boolean); // Remove any undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // For development: log blocked origins to help debug
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
  // Set timeout to 5 minutes for upload routes
  if (req.path.includes('/upload')) {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Outbound Impact API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
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

// ═══════════════════════════════════════════════════════════════
// 🛡️ LIGHTWEIGHT PROTECTION - FOR LOW MEMORY ENVIRONMENTS
// ═══════════════════════════════════════════════════════════════

// 🔄 Database connection refresh (every 2 hours - less frequent for low memory)
const dbRefresh = setInterval(async () => {
  try {
    console.log('🔄 Database connection refresh...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection is healthy');
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    // Try to recover
    try {
      console.log('🔄 Attempting database recovery...');
      await prisma.$disconnect();
      await new Promise(resolve => setTimeout(resolve, 3000));
      await prisma.$connect();
      console.log('✅ Database recovered!');
    } catch (recoveryError) {
      console.error('❌ Database recovery failed:', recoveryError.message);
    }
  }
}, 7200000); // Every 2 hours

// 🧹 Clear stuck database connections (every 3 hours)
const clearStuckConnections = setInterval(async () => {
  try {
    console.log('🧹 Clearing stuck connections...');
    
    await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '30 minutes'
        AND pid <> pg_backend_pid();
    `;
    
    console.log('✅ Stuck connections cleared');
  } catch (error) {
    console.error('❌ Failed to clear stuck connections:', error.message);
  }
}, 10800000); // Every 3 hours

// 🌙 Daily restart at 3 AM
const scheduleDailyRestart = () => {
  const now = new Date();
  const restartTime = new Date();
  
  restartTime.setHours(3, 0, 0, 0);
  
  if (now > restartTime) {
    restartTime.setDate(restartTime.getDate() + 1);
  }
  
  const msUntilRestart = restartTime.getTime() - now.getTime();
  const hoursUntil = Math.round(msUntilRestart / 1000 / 60 / 60);
  
  console.log(`⏰ Daily restart in ${hoursUntil}h at ${restartTime.toLocaleTimeString()}`);
  
  setTimeout(() => {
    console.log('🌙 Daily restart at 3 AM...');
    
    clearInterval(dbRefresh);
    clearInterval(clearStuckConnections);
    
    prisma.$disconnect()
      .then(() => {
        console.log('✅ Graceful shutdown complete');
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Shutdown error:', err);
        process.exit(1);
      });
  }, msUntilRestart);
};

// 🛑 Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} - shutting down...`);
  
  clearInterval(dbRefresh);
  clearInterval(clearStuckConnections);
  
  try {
    await prisma.$disconnect();
    console.log('✅ Clean shutdown');
    process.exit(0);
  } catch (error) {
    console.error('❌ Shutdown error:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════
// 🚀 START SERVER
// ═══════════════════════════════════════════════════════════════

if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, async () => {
    console.log('\n═══════════════════════════════════════════════');
    console.log('🚀 Outbound Impact Server');
    console.log('═══════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'Not set'}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('───────────────────────────────────────────────');
    console.log('🛡️ Protection Active:');
    console.log('  ✅ Database refresh (2h)');
    console.log('  ✅ Connection cleanup (3h)');
    console.log('  ✅ Daily restart (3 AM)');
    console.log('═══════════════════════════════════════════════\n');
    
    // Test database
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected');
      
      // Show memory stats
      const mem = process.memoryUsage();
      const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
      const rssMB = Math.round(mem.rss / 1024 / 1024);
      console.log(`📊 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB heap | ${rssMB}MB RSS`);
      console.log(`💪 GC available: ${global.gc ? 'Yes ✅' : 'No ⚠️'}\n`);
      
    } catch (error) {
      console.error('❌ Database failed:', error.message);
    }
    
    // Schedule daily restart in production
    if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
      scheduleDailyRestart();
    }
  });
}