const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function normalizeTeamEmails() {
  console.log('\n🔄 Normalizing team member emails...\n');

  try {
    const teamMembers = await prisma.teamMember.findMany({
      select: { id: true, email: true, userId: true },
    });

    console.log(`📊 Found ${teamMembers.length} team members\n`);

    let updated = 0;
    let skipped = 0;

    for (const member of teamMembers) {
      const normalizedEmail = member.email.toLowerCase().trim();

      if (member.email === normalizedEmail) {
        skipped++;
        continue;
      }

      await prisma.teamMember.update({
        where: { id: member.id },
        data: { email: normalizedEmail },
      });

      console.log(`✅ Updated: ${member.email} → ${normalizedEmail}`);
      updated++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Already normalized: ${skipped}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeTeamEmails();