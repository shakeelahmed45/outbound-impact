// ═══════════════════════════════════════════════════════════
// CREATE ADMIN USER SCRIPT
// Run this once to create or update your admin account
// ═══════════════════════════════════════════════════════════

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const createAdmin = async () => {
  try {
    console.log('🔧 Admin Setup Script Starting...\n');

    // ═══════════════════════════════════════════════════════════
    // CONFIGURE YOUR ADMIN ACCOUNT HERE
    // ═══════════════════════════════════════════════════════════
    
    const ADMIN_EMAIL = 'business.shakeelahmed@gmail.com'; // ← Your admin email
    const ADMIN_PASSWORD = 'Admin@123'; // ← Change this to your desired password
    const ADMIN_NAME = 'Shakeel Ahmed'; // ← Your name

    console.log('📧 Admin Email:', ADMIN_EMAIL);
    console.log('👤 Admin Name:', ADMIN_NAME);
    console.log('🔒 Admin Password: [HIDDEN]\n');

    // ═══════════════════════════════════════════════════════════
    // CHECK IF USER ALREADY EXISTS
    // ═══════════════════════════════════════════════════════════

    let user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (user) {
      console.log('✅ User already exists with email:', ADMIN_EMAIL);
      
      if (user.role === 'ADMIN') {
        console.log('✅ User already has ADMIN role!\n');
        
        // Ask if they want to update password
        console.log('🔄 Updating password...');
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { 
            password: hashedPassword,
            name: ADMIN_NAME,
          },
        });
        
        console.log('✅ Admin password updated successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ADMIN ACCOUNT READY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', ADMIN_EMAIL);
        console.log('🔑 Password: [Use the password you set above]');
        console.log('🔗 Login at: /admin-login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
      } else {
        console.log('🔄 User exists but role is:', user.role);
        console.log('🔄 Updating to ADMIN role...\n');
        
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { 
            role: 'ADMIN',
            password: hashedPassword,
            name: ADMIN_NAME,
          },
        });
        
        console.log('✅ User upgraded to ADMIN successfully!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ADMIN ACCOUNT READY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', ADMIN_EMAIL);
        console.log('🔑 Password: [Use the password you set above]');
        console.log('🔗 Login at: /admin-login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    } else {
      // ═══════════════════════════════════════════════════════════
      // CREATE NEW ADMIN USER
      // ═══════════════════════════════════════════════════════════
      
      console.log('📝 User does not exist. Creating new admin user...\n');
      
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      user = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          name: ADMIN_NAME,
          role: 'ADMIN',
        },
      });
      
      console.log('✅ Admin user created successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ADMIN ACCOUNT CREATED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Email:', ADMIN_EMAIL);
      console.log('🔑 Password: [Use the password you set above]');
      console.log('🔗 Login at: /admin-login');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('💡 Next Steps:');
    console.log('   1. Go to: https://www.outboundimpact.org/admin-login');
    console.log('   2. Login with the email and password above');
    console.log('   3. Access admin panel!\n');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
    console.error('\nFull error details:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database connection closed.\n');
  }
};

// Run the script
createAdmin();