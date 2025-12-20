require('dotenv').config();

console.log('\n🔍 Testing src/lib/prisma.js\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = require('./src/lib/prisma');

setTimeout(async () => {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('\n✅ Prisma lib works!');
    console.log('Query result:', result);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.log('\n❌ Prisma lib failed:', error.message);
    process.exit(1);
  }
}, 2000);
