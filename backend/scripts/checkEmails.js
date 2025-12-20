const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmails() {
  console.log('\n🔍 Checking existing emails in database...\n');

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${users.length} users\n`);

    let mixedCase = 0;
    let allLowercase = 0;

    users.forEach((user, index) => {
      const hasUpperCase = user.email !== user.email.toLowerCase();
      
      if (hasUpperCase) {
        mixedCase++;
        console.log(`${index + 1}. ❌ MIXED CASE: ${user.email} (should be: ${user.email.toLowerCase()})`);
        console.log(`   Name: ${user.name}`);
        console.log(`   ID: ${user.id}\n`);
      } else {
        allLowercase++;
      }
    });

    console.log('='.repeat(60));
    console.log(`✅ Already lowercase: ${allLowercase}`);
    console.log(`❌ Need normalization: ${mixedCase}`);
    console.log('='.repeat(60));

    if (mixedCase > 0) {
      console.log('\n⚠️  You need to run the normalization script!');
      console.log('Run: node scripts/normalizeEmails.js\n');
    } else {
      console.log('\n✅ All emails are already normalized!\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmails();