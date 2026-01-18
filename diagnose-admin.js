#!/usr/bin/env node
/**
 * Admin System Diagnostics
 * Checks configuration and provides setup recommendations
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Admin System Diagnostics\n');
console.log('=' .repeat(60) + '\n');

// 1. Check admin.html exists
console.log('1. Checking frontend files...');
const adminHtmlPath = path.join(__dirname, 'admin.html');
const adminJsPath = path.join(__dirname, 'js/admin.js');
const adminCssPath = path.join(__dirname, 'css/pro-admin.css');

console.log(`   admin.html: ${fs.existsSync(adminHtmlPath) ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`   js/admin.js: ${fs.existsSync(adminJsPath) ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`   css/pro-admin.css: ${fs.existsSync(adminCssPath) ? '✅ EXISTS' : '❌ MISSING'}\n`);

// 2. Check backend routes
console.log('2. Checking backend files...');
const adminRoutesPath = path.join(__dirname, 'src/routes/admin.js');
const serverPath = path.join(__dirname, 'src/server.js');

console.log(`   src/routes/admin.js: ${fs.existsSync(adminRoutesPath) ? '✅ EXISTS' : '❌ MISSING'}`);
console.log(`   src/server.js: ${fs.existsSync(serverPath) ? '✅ EXISTS' : '❌ MISSING'}\n`);

// 3. Check .env configuration
console.log('3. Checking .env configuration...');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('   .env: ✅ EXISTS');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  const hasAdminKey = envContent.includes('ADMIN_KEY') || envContent.includes('ADMIN_API_KEY');
  const hasDatabaseUrl = envContent.includes('DATABASE_URL');
  const hasPort = envContent.includes('PORT');
  
  console.log(`   - ADMIN_KEY configured: ${hasAdminKey ? '✅ YES' : '❌ NO'}`);
  console.log(`   - DATABASE_URL configured: ${hasDatabaseUrl ? '✅ YES' : '❌ NO'}`);
  console.log(`   - PORT configured: ${hasPort ? '✅ YES' : '❌ NO'}`);
  
  // Extract key value
  const keyMatch = envContent.match(/ADMIN_KEY=(.+)/);
  if (keyMatch) {
    console.log(`   - Admin key value: ${keyMatch[1].trim().substring(0, 20)}...\n`);
  }
} else {
  console.log('   .env: ❌ MISSING\n');
}

// 4. Check admin.js for key functions
console.log('4. Checking admin.js for required functions...');
if (fs.existsSync(adminJsPath)) {
  const adminJsContent = fs.readFileSync(adminJsPath, 'utf-8');
  
  const hasFetchUsers = adminJsContent.includes('fetchUsers');
  const hasVerifyKey = adminJsContent.includes('verifyAdminKey');
  const hasShowMessage = adminJsContent.includes('showMessage');
  const hasGetJSON = adminJsContent.includes('function getJSON');
  
  console.log(`   - fetchUsers(): ${hasFetchUsers ? '✅ YES' : '❌ NO'}`);
  console.log(`   - verifyAdminKey(): ${hasVerifyKey ? '✅ YES' : '❌ NO'}`);
  console.log(`   - showMessage(): ${hasShowMessage ? '✅ YES' : '❌ NO'}`);
  console.log(`   - getJSON(): ${hasGetJSON ? '✅ YES' : '❌ NO'}\n`);
}

// 5. Check admin routes for endpoints
console.log('5. Checking backend routes for admin endpoints...');
if (fs.existsSync(adminRoutesPath)) {
  const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf-8');
  
  const hasUsersGet = adminRoutesContent.includes("router.get('/users'");
  const hasTransactionsGet = adminRoutesContent.includes("router.get('/transactions'");
  const hasTestimoniesGet = adminRoutesContent.includes("router.get('/testimonies'");
  const hasVerifyKey = adminRoutesContent.includes("router.get('/verify-key'");
  const hasAdminKeyCheck = adminRoutesContent.includes('getAdminKey()');
  
  console.log(`   - GET /users endpoint: ${hasUsersGet ? '✅ YES' : '❌ NO'}`);
  console.log(`   - GET /transactions endpoint: ${hasTransactionsGet ? '✅ YES' : '❌ NO'}`);
  console.log(`   - GET /testimonies endpoint: ${hasTestimoniesGet ? '✅ YES' : '❌ NO'}`);
  console.log(`   - GET /verify-key endpoint: ${hasVerifyKey ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Admin key validation: ${hasAdminKeyCheck ? '✅ YES' : '❌ NO'}\n`);
}

// 6. Recommendations
console.log('=' .repeat(60));
console.log('\n📋 Setup Checklist:\n');

const checks = [
  { name: 'Frontend files exist', pass: fs.existsSync(adminHtmlPath) && fs.existsSync(adminJsPath) },
  { name: 'Backend files exist', pass: fs.existsSync(adminRoutesPath) && fs.existsSync(serverPath) },
  { name: '.env file exists', pass: fs.existsSync(envPath) },
];

let allPass = true;
for (const check of checks) {
  console.log(`${check.pass ? '✅' : '❌'} ${check.name}`);
  if (!check.pass) allPass = false;
}

console.log('\n📝 Next Steps:\n');
console.log('1. Run the admin test script:');
console.log('   node test-admin.js\n');
console.log('2. If tests fail, check ADMIN_SYSTEM_SETUP.md for detailed setup\n');
console.log('3. Start backend server:');
console.log('   npm run server:dev\n');
console.log('4. Start frontend (in another terminal):');
console.log('   npm start\n');
console.log('5. Open admin panel:');
console.log('   http://localhost:8080/admin.html\n');

if (allPass) {
  console.log('✅ All files found! Your admin system is ready to test.\n');
} else {
  console.log('❌ Some files are missing. Check the diagnostic output above.\n');
}
