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
// 🛡️ PERMANENT FIXES - RUN FOREVER
// ═══════════════════════════════════════════════════════════════

// 🧠 Memory monitoring and auto-cleanup (every 30 minutes)
const memoryMonitor = setInterval(async () => {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapUsagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  
  console.log(`📊 Memory Check: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%) | RSS: ${rssMB}MB`);
  
  // Auto-cleanup if memory usage is high
  if (heapUsagePercent > 85) {
    console.log(`⚠️ HIGH MEMORY USAGE (${heapUsagePercent}%)! Attempting cleanup...`);
    
    try {
      // Force garbage collection if available
      if (global.gc) {
        console.log('🧹 Running garbage collection...');
        global.gc();
        
        const afterGC = process.memoryUsage();
        const afterPercent = Math.round((afterGC.heapUsed / afterGC.heapTotal) * 100);
        const freed = heapUsedMB - Math.round(afterGC.heapUsed / 1024 / 1024);
        console.log(`✅ GC complete. Freed ${freed}MB. New usage: ${afterPercent}%`);
      }
      
      // Reconnect database to clear stale connections
      console.log('🔄 Reconnecting database...');
      await prisma.$disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database reconnected');
      
      const finalMem = process.memoryUsage();
      const finalPercent = Math.round((finalMem.heapUsed / finalMem.heapTotal) * 100);
      console.log(`✅ Cleanup complete. Final memory: ${finalPercent}%`);
      
      // If still critically high after cleanup, log warning
      if (finalPercent > 92) {
        console.error('🚨 CRITICAL: Memory still very high after cleanup!');
        console.error('🚨 Consider investigating memory leak sources in code');
      }
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }
}, 1800000); // Every 30 minutes

// 🔄 Database connection refresh (every hour)
const dbRefresh = setInterval(async () => {
  try {
    console.log('🔄 Hourly database connection refresh...');
    
    // Test current connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection is healthy');
    
    // Refresh anyway to prevent stale connections
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Database connection refreshed successfully');
  } catch (error) {
    console.error('❌ Database refresh failed:', error.message);
    
    // Try to recover
    try {
      console.log('🔄 Attempting database recovery...');
      await prisma.$disconnect();
      await new Promise(resolve => setTimeout(resolve, 5000));
      await prisma.$connect();
      console.log('✅ Database recovered!');
    } catch (recoveryError) {
      console.error('❌ Database recovery failed:', recoveryError.message);
    }
  }
}, 3600000); // Every 1 hour

// 🧹 Clear stuck database connections (every 2 hours)
const clearStuckConnections = setInterval(async () => {
  try {
    console.log('🧹 Clearing stuck database connections...');
    
    // Kill connections idle for > 30 minutes
    const result = await prisma.$queryRaw`
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
}, 7200000); // Every 2 hours

// 🌙 Daily restart at 3 AM (when traffic is lowest)
const scheduleDailyRestart = () => {
  const now = new Date();
  const restartTime = new Date();
  
  // Set to 3 AM
  restartTime.setHours(3, 0, 0, 0);
  
  // If 3 AM has passed today, schedule for tomorrow
  if (now > restartTime) {
    restartTime.setDate(restartTime.getDate() + 1);
  }
  
  const msUntilRestart = restartTime.getTime() - now.getTime();
  const hoursUntil = Math.round(msUntilRestart / 1000 / 60 / 60);
  
  console.log(`⏰ Daily restart scheduled for: ${restartTime.toLocaleString()} (${hoursUntil}h from now)`);
  
  setTimeout(() => {
    console.log('🌙 Daily scheduled restart at 3 AM...');
    console.log('✅ Graceful shutdown initiated');
    
    // Clean up intervals
    clearInterval(memoryMonitor);
    clearInterval(dbRefresh);
    clearInterval(clearStuckConnections);
    
    // Disconnect database
    prisma.$disconnect()
      .then(() => {
        console.log('✅ Database disconnected');
        console.log('🔄 Exiting... Railway will auto-restart');
        process.exit(0); // Railway will automatically restart
      })
      .catch(err => {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      });
  }, msUntilRestart);
};

// 🛑 Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  
  // Clear all intervals
  clearInterval(memoryMonitor);
  clearInterval(dbRefresh);
  clearInterval(clearStuckConnections);
  
  try {
    // Disconnect database
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION:', reason);
  console.error('Promise:', promise);
});

// ═══════════════════════════════════════════════════════════════
// 🚀 START SERVER
// ═══════════════════════════════════════════════════════════════

// Export for Vercel serverless function
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start server for local development and Railway
  app.listen(PORT, async () => {
    console.log('\n═══════════════════════════════════════════════');
    console.log('🚀 Outbound Impact Server Started');
    console.log('═══════════════════════════════════════════════');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}`);
    console.log(`📱 CORS: ${allowedOrigins.length} origins allowed`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✨ Enterprise features: ENABLED`);
    console.log(`🔍 Debug routes: /api/debug`);
    console.log('───────────────────────────────────────────────');
    console.log('🛡️ Permanent Protection Active:');
    console.log('  ✅ Memory monitoring (every 30 min)');
    console.log('  ✅ Auto-cleanup at 85% memory');
    console.log('  ✅ Database refresh (every hour)');
    console.log('  ✅ Stuck connection cleanup (every 2h)');
    console.log('  ✅ Daily restart at 3 AM');
    console.log('  ✅ Graceful shutdown handlers');
    console.log('═══════════════════════════════════════════════\n');
    
    // Test database connection on startup
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connected successfully');
      
      // Get initial memory stats
      const mem = process.memoryUsage();
      const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
      const heapUsagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
      console.log(`📊 Initial memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`);
      console.log(`💪 Garbage collection: ${global.gc ? 'AVAILABLE ✅' : 'NOT AVAILABLE ⚠️ (add --expose-gc to NODE_OPTIONS)'}\n`);
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('⚠️ Server will continue but database operations will fail\n');
    }
    
    // Schedule daily restart (only in production)
    if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
      scheduleDailyRestart();
    } else {
      console.log('ℹ️ Daily restart disabled in development mode\n');
    }
  });
}