#!/usr/bin/env node
/**
 * Transaction Logging Verification Script
 * Checks that all transaction types are being logged correctly
 */

const path = require('path');
const fs = require('fs');

console.log('\n📊 Transaction Logging Verification\n');
console.log('=' .repeat(70));

// Check database schema for transactions table
console.log('\n1️⃣  Checking Transaction Table Schema...\n');

const initDbPath = path.join(__dirname, 'src/db/init.js');
const initDbContent = fs.readFileSync(initDbPath, 'utf-8');

const transactionTableRegex = /CREATE TABLE IF NOT EXISTS transactions[\s\S]*?\);/;
const match = initDbContent.match(transactionTableRegex);

if (match) {
  console.log('✅ Transaction table schema found:');
  console.log('   ' + match[0].split('\n').slice(0, 3).join('\n   ') + '...');
} else {
  console.log('❌ Transaction table schema NOT found');
}

// Check for transaction logging in simulator
console.log('\n2️⃣  Checking Simulator Transaction Logging...\n');

const simulatorPath = path.join(__dirname, 'src/jobs/balanceGrowthSimulator.js');
if (fs.existsSync(simulatorPath)) {
  const simContent = fs.readFileSync(simulatorPath, 'utf-8');
  
  if (simContent.includes('INSERT INTO transactions') || simContent.includes('INSERT INTO trades')) {
    console.log('✅ Simulator includes transaction logging');
    
    const insertCount = (simContent.match(/INSERT INTO/g) || []).length;
    console.log(`   Found ${insertCount} INSERT statements in simulator`);
  } else {
    console.log('⚠️  Simulator may not be logging transactions');
  }
} else {
  console.log('⚠️  Simulator file not found at:', simulatorPath);
}

// Check for admin routes transaction logging
console.log('\n3️⃣  Checking Admin Routes Transaction Logging...\n');

const adminRoutesPath = path.join(__dirname, 'src/routes/admin.js');
if (fs.existsSync(adminRoutesPath)) {
  const adminContent = fs.readFileSync(adminRoutesPath, 'utf-8');
  
  const insertTransactionCount = (adminContent.match(/INSERT INTO transactions/g) || []).length;
  const insertTradesCount = (adminContent.match(/INSERT INTO trades/g) || []).length;
  
  console.log(`✅ Admin routes logging:`);
  console.log(`   - ${insertTransactionCount} transaction inserts`);
  console.log(`   - ${insertTradesCount} trade inserts`);
  
  // Check specific operations
  if (adminContent.includes("type='adjustment'")) console.log('   ✅ Balance adjustments logged');
  if (adminContent.includes("type='deposit'")) console.log('   ✅ Deposits logged');
  if (adminContent.includes("type='credit'")) console.log('   ✅ Admin credits logged');
} else {
  console.log('❌ Admin routes file not found');
}

// Check for withdrawal logging
console.log('\n4️⃣  Checking Withdrawal Transaction Logging...\n');

const withdrawalsPath = path.join(__dirname, 'src/routes/withdrawals.js');
if (fs.existsSync(withdrawalsPath)) {
  const withdrawContent = fs.readFileSync(withdrawalsPath, 'utf-8');
  
  if (withdrawContent.includes('INSERT INTO transactions') || withdrawContent.includes("type='withdrawal'")) {
    console.log('✅ Withdrawal logging found');
  } else {
    console.log('⚠️  Withdrawal logging may be missing');
  }
} else {
  console.log('⚠️  Withdrawals route not found');
}

// Check for trade logging
console.log('\n5️⃣  Checking Trade Transaction Logging...\n');

const tradesPath = path.join(__dirname, 'src/routes/trades.js');
if (fs.existsSync(tradesPath)) {
  const tradesContent = fs.readFileSync(tradesPath, 'utf-8');
  
  if (tradesContent.includes('INSERT INTO trades') || tradesContent.includes('INSERT INTO transactions')) {
    console.log('✅ Trade logging found');
  } else {
    console.log('⚠️  Trade logging may be missing');
  }
} else {
  console.log('⚠️  Trades route not found');
}

// Summary of transaction types
console.log('\n6️⃣  Summary of Logged Transaction Types...\n');

const expectedTypes = [
  { type: 'deposit', description: 'User deposits', file: 'withdrawals.js' },
  { type: 'withdrawal', description: 'User withdrawals', file: 'withdrawals.js' },
  { type: 'trade', description: 'Portfolio trades', file: 'trades.js' },
  { type: 'adjustment', description: 'Admin balance adjustments', file: 'admin.js' },
  { type: 'credit', description: 'Admin credits', file: 'admin.js' },
  { type: 'buy', description: 'Buy orders', file: 'trades.js' },
  { type: 'sell', description: 'Sell orders', file: 'trades.js' }
];

let allFoundCount = 0;
expectedTypes.forEach(t => {
  let found = false;
  
  // Check if type is logged anywhere
  const filesToCheck = [adminRoutesPath, withdrawalsPath, tradesPath, simulatorPath];
  for (const filePath of filesToCheck) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(`'${t.type}'`) || content.includes(`"${t.type}"`)) {
        found = true;
        break;
      }
    }
  }
  
  console.log(`${found ? '✅' : '❌'} ${t.type.padEnd(12)} - ${t.description}`);
  if (found) allFoundCount++;
});

console.log('\n' + '=' .repeat(70));
console.log(`\n📈 Transaction Logging Status: ${allFoundCount}/${expectedTypes.length} types found\n`);

// Recommendations
if (allFoundCount === expectedTypes.length) {
  console.log('✅ All transaction types are being logged!\n');
} else {
  console.log('⚠️  Some transaction types may not be logged. Consider adding logging for:\n');
  expectedTypes.forEach(t => {
    const filesToCheck = [adminRoutesPath, withdrawalsPath, tradesPath, simulatorPath];
    let found = false;
    for (const filePath of filesToCheck) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes(`'${t.type}'`) || content.includes(`"${t.type}"`)) {
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.log(`   - ${t.type} (${t.description})\n`);
    }
  });
}

console.log('💡 Recommendations:\n');
console.log('1. Run integration tests with database to verify logging works');
console.log('2. Check /api/admin/transactions endpoint returns all transaction types');
console.log('3. Monitor transaction table size for performance issues');
console.log('4. Archive old transactions periodically to maintain performance\n');
