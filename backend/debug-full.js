const fs = require('fs');
const path = require('path');

console.log('\n🔍 COMPREHENSIVE DIAGNOSTIC\n');
console.log('='.repeat(60));

// 1. Check working directory
console.log('\n1️⃣ WORKING DIRECTORY');
console.log('Current directory:', process.cwd());
console.log('Script location:', __dirname);

// 2. Check for .env files
console.log('\n2️⃣ .ENV FILES CHECK');
const envPaths = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  'src/.env',
  '../.env'
];

envPaths.forEach(p => {
  const fullPath = path.resolve(p);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${p} -> ${exists ? fullPath : 'NOT FOUND'}`);
  
  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const dbUrl = content.split('\n').find(line => line.startsWith('DATABASE_URL'));
    if (dbUrl) {
      console.log(`   DATABASE_URL: ${dbUrl.substring(0, 80)}...`);
    }
  }
});

// 3. Load dotenv and check
console.log('\n3️⃣ DOTENV LOADING TEST');
require('dotenv').config();
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  console.log('Length:', url.length);
  console.log('First 50 chars:', url.substring(0, 50));
  console.log('Last 50 chars:', url.substring(url.length - 50));
  console.log('Contains sslmode:', url.includes('sslmode'));
  console.log('SSL mode value:', url.match(/sslmode=([^&"']*)/)?.[1] || 'NONE');
}

// 4. Check Prisma client
console.log('\n4️⃣ PRISMA CLIENT CHECK');
try {
  const prismaPath = require.resolve('@prisma/client');
  console.log('✅ @prisma/client found at:', prismaPath);
  
  const { PrismaClient } = require('@prisma/client');
  console.log('✅ PrismaClient loaded');
  
  // Check what URL Prisma sees
  const prisma = new PrismaClient({
    log: ['info'],
  });
  
  console.log('\n5️⃣ PRISMA CONNECTION TEST');
  console.log('Attempting to connect...');
  
  prisma.$connect()
    .then(() => {
      console.log('✅ Prisma connected successfully!');
      return prisma.$queryRaw`SELECT current_database(), version()`;
    })
    .then((result) => {
      console.log('✅ Query successful');
      console.log('Database:', result[0].current_database);
      console.log('Version:', result[0].version.split(' ')[0]);
      return prisma.$disconnect();
    })
    .then(() => {
      console.log('✅ Disconnected');
      console.log('\n' + '='.repeat(60));
      console.log('✅ EVERYTHING WORKS! Problem is in server.js\n');
      process.exit(0);
    })
    .catch((error) => {
      console.log('❌ Prisma connection FAILED');
      console.log('Error:', error.message);
      console.log('Code:', error.code);
      console.log('\n' + '='.repeat(60));
      console.log('❌ PROBLEM FOUND: Prisma can\'t connect\n');
      process.exit(1);
    });
  
} catch (error) {
  console.log('❌ Prisma client error:', error.message);
}

// 6. Check server.js
console.log('\n6️⃣ SERVER.JS CHECK');
const serverPath = path.resolve('src/server.js');
if (fs.existsSync(serverPath)) {
  console.log('✅ server.js found');
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  
  // Check if dotenv.config() is at the top
  const lines = serverContent.split('\n').slice(0, 20);
  const hasDotenv = lines.some(line => line.includes('dotenv') && line.includes('config'));
  const dotenvLine = lines.findIndex(line => line.includes('dotenv') && line.includes('config'));
  
  console.log('Has dotenv.config():', hasDotenv ? '✅ YES' : '❌ NO');
  if (hasDotenv) {
    console.log('Line number:', dotenvLine + 1);
    console.log('Is it FIRST?:', dotenvLine < 5 ? '✅ YES' : '❌ NO (should be first!)');
  }
  
  // Check prisma import
  const hasPrismaImport = serverContent.includes('require(') && 
                          (serverContent.includes('./src/lib/prisma') || 
                           serverContent.includes('./lib/prisma'));
  console.log('Imports Prisma:', hasPrismaImport ? '✅ YES' : '❌ NO');
} else {
  console.log('❌ server.js NOT FOUND at:', serverPath);
}
