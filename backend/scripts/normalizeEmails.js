const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalizeEmails() {
  console.log('\n🔄 Starting email normalization...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    console.log(`📊 Found ${users.length} users to check\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      const normalizedEmail = user.email.toLowerCase().trim();

      // Skip if already normalized
      if (user.email === normalizedEmail) {
        skipped++;
        continue;
      }

      try {
        // Check if normalized email already exists (different user)
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existing && existing.id !== user.id) {
          console.log(`⚠️  DUPLICATE FOUND:`);
          console.log(`   Original: ${user.email} (${user.name}) - ID: ${user.id}`);
          console.log(`   Conflicts with: ${existing.email} (${existing.name}) - ID: ${existing.id}`);
          console.log(`   ❌ MANUAL ACTION REQUIRED - Cannot auto-normalize\n`);
          errors++;
        } else {
          // Safe to update
          await prisma.user.update({
            where: { id: user.id },
            data: { email: normalizedEmail },
          });
          console.log(`✅ Updated: ${user.email} → ${normalizedEmail}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Already normalized: ${skipped}`);
    console.log(`❌ Errors/Duplicates: ${errors}`);
    console.log('='.repeat(60) + '\n');

    if (errors > 0) {
      console.log('⚠️  Some emails could not be normalized due to duplicates.');
      console.log('You need to manually resolve these conflicts.\n');
    } else if (updated > 0) {
      console.log('✅ All emails normalized successfully!\n');
    } else {
      console.log('✅ All emails were already normalized!\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeEmails();