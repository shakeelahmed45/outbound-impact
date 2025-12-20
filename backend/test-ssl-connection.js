require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testSSLConnection() {
  console.log('🔐 Testing Railway SSL Connection\n');
  
  const dbUrl = process.env.DATABASE_URL;
  console.log('📍 Database URL:', dbUrl?.replace(/:[^:]*@/, ':****@'));
  
  // ✅ Check if SSL is in URL
  if (!dbUrl?.includes('sslmode=require')) {
    console.error('❌ WARNING: DATABASE_URL missing SSL parameter!');
    console.error('   Add: ?sslmode=require to your DATABASE_URL\n');
  } else {
    console.log('✅ SSL parameter found in DATABASE_URL\n');
  }

  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔄 Connecting to database with SSL...\n');
    
    await prisma.$connect();
    console.log('✅ SSL Connection successful!\n');

    // Test query
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log('✅ Query test passed');
    console.log('📦 PostgreSQL:', result[0].version.split(' ')[0]);
    console.log('');

    // Count users
    const userCount = await prisma.user.count();
    console.log('✅ Table access successful');
    console.log('👥 Users:', userCount);
    console.log('');

    console.log('🎉 ALL SSL TESTS PASSED!\n');

  } catch (error) {
    console.error('❌ SSL CONNECTION FAILED!\n');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('\n💡 Fix:');
    console.error('1. Add ?sslmode=require to DATABASE_URL');
    console.error('2. Or get fresh URL from Railway Variables tab\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSSLConnection();