#!/usr/bin/env node

/**
 * COMPREHENSIVE DEBUG SCRIPT
 * This will show EXACTLY why Railway is killing your container
 */

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 STARTING COMPREHENSIVE DEBUG');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Track all exit attempts
const originalExit = process.exit;
process.exit = function(code) {
  console.error('\n🚨 process.exit() CALLED!');
  console.error('Exit code:', code);
  console.error('Call stack:', new Error().stack);
  console.error('Uptime:', process.uptime(), 'seconds');
  originalExit.call(process, code);
};

// Track all signals
process.on('SIGTERM', () => {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 SIGTERM RECEIVED FROM RAILWAY!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Time:', new Date().toISOString());
  console.error('Uptime:', process.uptime(), 'seconds');
  console.error('Memory:', process.memoryUsage());
  console.error('\nRailway is killing this container!');
  console.error('This means Railway thinks the app failed health checks.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.error('\n🚨 SIGINT RECEIVED');
  process.exit(0);
});

// Track all uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 UNCAUGHT EXCEPTION!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 UNHANDLED REJECTION!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
});

// Log memory every 5 seconds
const memoryLogger = setInterval(() => {
  const mem = process.memoryUsage();
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  
  console.log(`⏱️  Uptime: ${Math.floor(process.uptime())}s | Heap: ${heapTotalMB}MB (${heapUsedMB}MB used) | RSS: ${rssMB}MB`);
  
  // Alert if heap is not growing after 60 seconds
  if (process.uptime() > 60 && heapTotalMB < 50) {
    console.warn('⚠️  WARNING: Heap not growing! Still at', heapTotalMB, 'MB after', Math.floor(process.uptime()), 'seconds');
  }
  
  // Alert if heap suddenly grew
  if (heapTotalMB > 100) {
    console.log('✅ HEAP GREW TO', heapTotalMB, 'MB - This is good!');
  }
}, 5000);

// Don't let the memory logger keep process alive
memoryLogger.unref();

console.log('📊 Environment:');
console.log('  Node version:', process.version);
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  Database URL:', process.env.DATABASE_URL ? 'SET ✅' : 'NOT SET ❌');
console.log('\n🚀 Loading server.js...\n');

// Import and run server
try {
  require('./src/server.js');
  console.log('\n✅ Server loaded and running!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} catch (error) {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('🚨 FAILED TO LOAD SERVER!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}