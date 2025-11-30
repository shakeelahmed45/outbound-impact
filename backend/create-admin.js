const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@outboundimpact.com';
  const password = 'Admin123!'; // Change this!
  const name = 'Admin User';

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role:', admin.role);
}

createAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());