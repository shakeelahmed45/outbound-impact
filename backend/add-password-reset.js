// backend/add-password-reset.js

// ✅ THIS LINE IS CRITICAL - Loads .env file!
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPasswordResetFields() {
  try {
    console.log('🔐 Adding Password Reset Fields...\n');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "resetToken" TEXT,
      ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
    `);
    
    console.log('✅ Added columns');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "User_resetToken_idx" ON "User"("resetToken");
    `);
    
    console.log('✅ Added index\n');
    console.log('📋 NEXT: Update schema.prisma and run npx prisma generate\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPasswordResetFields();