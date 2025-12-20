require('dotenv').config();

console.log('\n🔍 Environment Variable Test\n');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('\n✅ Checking SSL parameter...');

if (process.env.DATABASE_URL?.includes('?sslmode=require')) {
  console.log('✅ SSL parameter FOUND!\n');
} else {
  console.log('❌ SSL parameter MISSING!\n');
  console.log('Expected to end with: ?sslmode=require');
  console.log('Your URL ends with:', process.env.DATABASE_URL?.split('railway')[1] || 'unknown');
  console.log('\nFix: Edit backend/.env and add ?sslmode=require to DATABASE_URL\n');
}
