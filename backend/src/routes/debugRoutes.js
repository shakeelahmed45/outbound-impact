// ✅ backend/src/routes/debugRoutes.js
// Real-time debugging routes - copy this entire file!

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Real-time health check - shows everything
router.get('/live', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    serverUptime: Math.floor(process.uptime()),
    checks: {}
  };
  
  try {
    // 1. Test database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    diagnostics.checks.database = {
      status: '✅ CONNECTED',
      responseTime: `${Date.now() - dbStart}ms`
    };
    
    // 2. Check connections
    const connections = await prisma.$queryRaw`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE state = 'idle in transaction') as stuck
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `;
    
    const conn = connections[0];
    const total = Number(conn.total);
    
    diagnostics.checks.connections = {
      total: total,
      active: Number(conn.active),
      idle: Number(conn.idle),
      stuck: Number(conn.stuck),
      alert: total > 15 ? '⚠️ HIGH! (Limit: 20)' : '✅ OK'
    };
    
    // 3. Check memory
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const usage = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    
    diagnostics.checks.memory = {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      usage: `${usage}%`,
      alert: usage > 90 ? '⚠️ HIGH!' : '✅ OK'
    };
    
    // 4. Check DATABASE_URL configuration
    const dbUrl = process.env.DATABASE_URL || '';
    diagnostics.checks.configuration = {
      hasConnectionLimit: dbUrl.includes('connection_limit') ? '✅ Yes' : '❌ No - ADD THIS!',
      hasKeepalive: dbUrl.includes('keepalive') ? '✅ Yes' : '❌ No - ADD THIS!',
      usesPrivateUrl: dbUrl.includes('railway.internal') ? '✅ Yes' : '⚠️ Using public URL - CHANGE THIS!',
      host: dbUrl.split('@')[1]?.split(':')[0] || 'unknown'
    };
    
    // Overall health
    const hasIssues = 
      total > 15 ||
      usage > 90 ||
      !dbUrl.includes('keepalive') ||
      !dbUrl.includes('railway.internal');
    
    diagnostics.overallHealth = hasIssues ? '⚠️ ISSUES DETECTED' : '✅ HEALTHY';
    
    console.log('🔍 Debug check:', JSON.stringify(diagnostics, null, 2));
    res.json(diagnostics);
    
  } catch (error) {
    diagnostics.checks.error = {
      message: error.message,
      code: error.code,
      status: '❌ CRITICAL ERROR'
    };
    diagnostics.overallHealth = '❌ UNHEALTHY';
    
    console.error('❌ Debug check failed:', error);
    res.status(503).json(diagnostics);
  }
});

// Emergency: Clear idle connections
router.post('/clear-idle', async (req, res) => {
  try {
    console.log('🧹 Clearing idle connections...');
    
    await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '5 minutes'
        AND pid <> pg_backend_pid();
    `;
    
    res.json({ 
      status: 'success', 
      message: 'Cleared idle connections' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// Emergency: Reconnect database
router.post('/reconnect', async (req, res) => {
  try {
    console.log('🔄 Reconnecting database...');
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'success', 
      message: 'Database reconnected' 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

module.exports = router;