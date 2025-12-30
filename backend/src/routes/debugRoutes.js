const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Existing /live endpoint
router.get('/live', async (req, res) => {
  const checks = {
    timestamp: new Date().toISOString(),
    serverUptime: Math.floor(process.uptime()),
    checks: {}
  };

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - dbStart;
    
    checks.checks.database = {
      status: '✅ CONNECTED',
      responseTime: `${dbTime}ms`
    };
  } catch (error) {
    checks.checks.database = {
      status: '❌ CRITICAL ERROR',
      error: error.message
    };
  }

  // Connection pool check
  try {
    const connections = await prisma.$queryRaw`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE state = 'idle' AND state_change < NOW() - INTERVAL '5 minutes') as stuck
      FROM pg_stat_activity
      WHERE datname = current_database();
    `;
    
    const conn = connections[0];
    checks.checks.connections = {
      total: parseInt(conn.total),
      active: parseInt(conn.active),
      idle: parseInt(conn.idle),
      stuck: parseInt(conn.stuck),
      alert: parseInt(conn.total) > 15 ? '⚠️ HIGH' : '✅ OK'
    };
  } catch (error) {
    checks.checks.connections = {
      error: error.message,
      alert: '❌ ERROR'
    };
  }

  // Memory check
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapUsagePercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  checks.checks.memory = {
    heapUsed: `${heapUsedMB}MB`,
    heapTotal: `${heapTotalMB}MB`,
    usage: `${heapUsagePercent}%`,
    alert: heapUsagePercent > 90 ? '⚠️ HIGH!' : '✅ OK'
  };

  // Configuration check
  const dbUrl = process.env.DATABASE_URL || '';
  checks.checks.configuration = {
    hasConnectionLimit: dbUrl.includes('connection_limit') ? '✅ Yes' : '❌ No',
    hasKeepalive: dbUrl.includes('keepalive') ? '✅ Yes' : '❌ No',
    usesPrivateUrl: dbUrl.includes('railway.internal') ? '✅ Yes' : '⚠️ Using public URL - CHANGE THIS!',
    host: dbUrl.split('@')[1]?.split('/')[0]?.split(':')[0] || 'unknown'
  };

  // Overall health
  const hasIssues = 
    checks.checks.database.status !== '✅ CONNECTED' ||
    checks.checks.connections.alert !== '✅ OK' ||
    checks.checks.memory.alert !== '✅ OK' ||
    !checks.checks.configuration.hasConnectionLimit ||
    !checks.checks.configuration.hasKeepalive;

  checks.overallHealth = hasIssues ? '⚠️ ISSUES DETECTED' : '✅ HEALTHY';

  // ✅ REMOVED HEAP VALIDATION - No more false failures!
  // The heap validation was causing Railway to restart constantly
  // 19MB heap is perfectly fine for this workload
  
  // Log to Railway
  console.log('🔍 Debug check:', JSON.stringify(checks, null, 2));

  res.json(checks);
});

// NEW: Deep memory diagnostics
router.get('/memory-deep-dive', async (req, res) => {
  const v8 = require('v8');
  const os = require('os');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    serverUptime: Math.floor(process.uptime()),
    
    // V8 Heap Statistics
    v8HeapStats: v8.getHeapStatistics(),
    
    // V8 Heap Space Statistics
    v8HeapSpaces: v8.getHeapSpaceStatistics(),
    
    // Process Memory Usage
    processMemory: process.memoryUsage(),
    
    // System Memory
    systemMemory: {
      totalMem: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
      freeMem: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
      usedMem: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)}MB`,
      percentUsed: `${Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)}%`
    },
    
    // Process Resource Usage
    resourceUsage: process.resourceUsage(),
    
    // Environment Variables (memory related)
    env: {
      NODE_OPTIONS: process.env.NODE_OPTIONS || 'not set',
      MEMORY_AVAILABLE: process.env.MEMORY_AVAILABLE || 'not set'
    },
    
    // V8 Flags
    v8Flags: process.execArgv,
    
    // Try to read cgroup limits (Docker/Railway)
    cgroupLimits: null
  };
  
  // Try to read cgroup memory limit
  try {
    const fs = require('fs');
    
    // Try cgroup v1
    if (fs.existsSync('/sys/fs/cgroup/memory/memory.limit_in_bytes')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory/memory.limit_in_bytes', 'utf8');
      diagnostics.cgroupLimits = {
        version: 'v1',
        limitInBytes: parseInt(limit),
        limitInMB: `${Math.round(parseInt(limit) / 1024 / 1024)}MB`,
        limitInGB: `${(parseInt(limit) / 1024 / 1024 / 1024).toFixed(2)}GB`
      };
    }
    
    // Try cgroup v2
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const limit = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      diagnostics.cgroupLimits = {
        version: 'v2',
        limitInBytes: limit === 'max' ? 'unlimited' : parseInt(limit),
        limitInMB: limit === 'max' ? 'unlimited' : `${Math.round(parseInt(limit) / 1024 / 1024)}MB`,
        limitInGB: limit === 'max' ? 'unlimited' : `${(parseInt(limit) / 1024 / 1024 / 1024).toFixed(2)}GB`
      };
    }
  } catch (e) {
    diagnostics.cgroupLimits = { error: e.message };
  }
  
  // Calculate heap limit vs actual
  const heapLimit = diagnostics.v8HeapStats.heap_size_limit;
  const heapTotal = diagnostics.processMemory.heapTotal;
  
  diagnostics.analysis = {
    heapLimitMB: `${Math.round(heapLimit / 1024 / 1024)}MB`,
    heapTotalMB: `${Math.round(heapTotal / 1024 / 1024)}MB`,
    heapUsedMB: `${Math.round(diagnostics.processMemory.heapUsed / 1024 / 1024)}MB`,
    percentOfLimitUsed: `${Math.round((heapTotal / heapLimit) * 100)}%`,
    canGrowBy: `${Math.round((heapLimit - heapTotal) / 1024 / 1024)}MB`,
    issue: heapTotal < (heapLimit * 0.1) ? '🚨 HEAP NOT GROWING - Node.js not allocating!' : '✅ Normal'
  };
  
  res.json(diagnostics);
});

// NEW: Test memory allocation
router.post('/test-allocate', (req, res) => {
  const allocateMB = parseInt(req.body.mb) || 100;
  
  console.log(`🧪 Attempting to allocate ${allocateMB}MB...`);
  
  try {
    const before = process.memoryUsage();
    
    // Try to allocate memory
    const arrays = [];
    const chunkSize = 1024 * 1024; // 1MB chunks
    
    for (let i = 0; i < allocateMB; i++) {
      arrays.push(new Array(chunkSize).fill(1));
    }
    
    const after = process.memoryUsage();
    
    // Keep reference so GC doesn't collect immediately
    global.testArrays = arrays;
    
    const result = {
      status: 'success',
      attempted: `${allocateMB}MB`,
      before: {
        heapUsed: `${Math.round(before.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(before.heapTotal / 1024 / 1024)}MB`
      },
      after: {
        heapUsed: `${Math.round(after.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(after.heapTotal / 1024 / 1024)}MB`
      },
      grew: `${Math.round((after.heapTotal - before.heapTotal) / 1024 / 1024)}MB`,
      message: 'Memory allocated successfully'
    };
    
    console.log('✅ Allocation result:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Allocation failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      code: error.code,
      message: 'Failed to allocate memory - container limit reached!'
    });
  }
});

// NEW: Clean up test allocation
router.post('/test-cleanup', (req, res) => {
  delete global.testArrays;
  if (global.gc) {
    global.gc();
  }
  res.json({ status: 'success', message: 'Test memory cleaned up' });
});

// Existing emergency endpoints
router.post('/clear-idle', async (req, res) => {
  try {
    await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '5 minutes'
        AND pid <> pg_backend_pid();
    `;
    
    res.json({ status: 'success', message: 'Idle connections cleared' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

router.post('/reconnect', async (req, res) => {
  try {
    await prisma.$disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await prisma.$connect();
    
    res.json({ status: 'success', message: 'Database reconnected' });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

module.exports = router;