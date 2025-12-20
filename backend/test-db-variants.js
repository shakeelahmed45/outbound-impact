const { PrismaClient } = require('@prisma/client');

const urls = [
  'postgresql://postgres:IYjJZEEfkCWBuSAbBnUnDatAlqaKcVwR@gondola.proxy.rlwy.net:25134/railway?sslmode=require',
  'postgresql://postgres:IYjJZEEfkCWBuSAbBnUnDatAlqaKcVwR@gondola.proxy.rlwy.net:25134/railway?sslmode=require&sslaccept=accept_invalid_certs',
  'postgresql://postgres:IYjJZEEfkCWBuSAbBnUnDatAlqaKcVwR@gondola.proxy.rlwy.net:25134/railway?ssl=true',
  'postgresql://postgres:IYjJZEEfkCWBuSAbBnUnDatAlqaKcVwR@gondola.proxy.rlwy.net:25134/railway?sslmode=prefer',
  'postgresql://postgres:IYjJZEEfkCWBuSAbBnUnDatAlqaKcVwR@gondola.proxy.rlwy.net:25134/railway?sslmode=disable',
];

async function testUrl(url, index) {
  console.log(`\n🧪 Testing URL variant ${index + 1}:`);
  console.log('SSL params:', url.split('?')[1]);
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    },
    log: ['error']
  });

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ SUCCESS! This URL works!');
    console.log('Use this in your .env:');
    console.log(url);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message);
    await prisma.$disconnect();
    return false;
  }
}

async function testAll() {
  console.log('🔍 Testing different SSL configurations...\n');
  
  for (let i = 0; i < urls.length; i++) {
    const success = await testUrl(urls[i], i);
    if (success) {
      console.log('\n✅ WORKING CONFIGURATION FOUND!\n');
      process.exit(0);
    }
  }
  
  console.log('\n❌ None of the SSL configurations worked');
  console.log('This might be a network/firewall issue\n');
}

testAll();