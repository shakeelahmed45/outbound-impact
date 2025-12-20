require('dotenv').config();

// ✅ Use the shared Prisma client with correct SSL config
const prisma = require('./src/lib/prisma');

async function testDuplicateCheck() {
  console.log('\n🧪 Testing duplicate email check...\n');

  const testEmails = [
    'sa0600107@gmail.com',
    'SA0600107@GMAIL.COM',
    'Sa0600107@Gmail.com',
  ];

  for (const email of testEmails) {
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`Testing: ${email}`);
    console.log(`Normalized to: ${normalizedEmail}`);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true }
    });

    if (existingUser) {
      console.log(`✅ FOUND existing user:`);
      console.log(`   Database email: ${existingUser.email}`);
      console.log(`   User: ${existingUser.name}`);
      console.log(`   ID: ${existingUser.id}`);
    } else {
      console.log(`❌ NO user found (duplicate would be allowed!)`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

testDuplicateCheck();