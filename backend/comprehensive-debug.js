#!/usr/bin/env node

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 STARTING WITH GC CONTROL');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Track all exit attempts
const originalExit = process.exit;
process.exit = function(code) {
  console.error('\n🚨 process.exit() CALLED!');
  console.error('Exit code:', code);
  console.error('Call stack:', new Error().stack);
  originalExit.call(process, code);
};

// Track signals
process.on('SIGTERM', () => {
  console.error('\n🚨 SIGTERM RECEIVED FROM RAILWAY!');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('\n🚨 SIGINT RECEIVED');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n🚨 UNCAUGHT EXCEPTION!');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n🚨 UNHANDLED REJECTION!');
  console.error('Reason:', reason);
  process.exit(1);
});

console.log('📊 Environment:');
console.log('  Node version:', process.version);
console.log('  NODE_OPTIONS:', process.env.NODE_OPTIONS || 'NOT SET ❌');

// 🔥 CREATE PERSISTENT MEMORY CACHE
console.log('\n🔥 CREATING PERSISTENT MEMORY CACHE...');
const persistentCache = {
  // Keep 50MB of data permanently in memory
  warmupData: new Array(50).fill(null).map((_, i) => new Array(1024 * 1024).fill(i)),
  // This prevents GC from freeing everything
  timestamp: Date.now()
};

// Make it global so it's never freed
global._persistentCache = persistentCache;

const mem = process.memoryUsage();
console.log('✅ Persistent cache created!');
console.log('   Heap Total:', Math.round(mem.heapTotal / 1024 / 1024), 'MB');
console.log('   Heap Used:', Math.round(mem.heapUsed / 1024 / 1024), 'MB');
console.log('   This memory will NEVER be freed by GC!');

console.log('\n🚀 Loading server.js...\n');

// Monitor memory every 30 seconds
const memoryLogger = setInterval(() => {
  const mem = process.memoryUsage();
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  
  const uptime = Math.floor(process.uptime());
  console.log(`⏱️  Uptime: ${uptime}s | Heap: ${heapTotalMB}MB (${heapUsedMB}MB used) | RSS: ${rssMB}MB`);
  
  if (heapTotalMB > 100) {
    console.log('✅ HEAP STABLE AT', heapTotalMB, 'MB - Persistent cache working!');
  } else if (uptime > 60 && heapTotalMB < 80) {
    console.warn('⚠️  WARNING: Heap dropped to', heapTotalMB, 'MB - GC may be too aggressive');
  }
}, 30000);

memoryLogger.unref();

// Load server
try {
  require('./src/server.js');
  console.log('\n✅ Server loaded and running!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} catch (error) {
  console.error('\n🚨 FAILED TO LOAD SERVER!');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}