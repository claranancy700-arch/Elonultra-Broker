#!/usr/bin/env node
/**
 * Audit script to find all localStorage.getItem('balance') usage
 * These should be replaced with backend balance fetches for accuracy
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const jsDir = path.join(__dirname, 'js');
const htmlDir = __dirname;

let findings = [];

// Search in JS files
const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
jsFiles.forEach(file => {
  const filePath = path.join(jsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    if (line.includes("localStorage.getItem('balance')") || 
        line.includes('localStorage.getItem("balance")') ||
        line.match(/localStorage\.getItem\s*\(\s*['"](balance|userBalance)['"]\s*\)/)) {
      findings.push({
        file: `js/${file}`,
        line: idx + 1,
        code: line.trim(),
        severity: 'HIGH - use backend balance instead'
      });
    }
  });
});

// Search in HTML files
const htmlFiles = fs.readdirSync(htmlDir)
  .filter(f => f.endsWith('.html') && !f.includes('node_modules'));

htmlFiles.forEach(file => {
  const filePath = path.join(htmlDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    if (line.includes("localStorage.getItem('balance')") || 
        line.includes('localStorage.getItem("balance")') ||
        line.match(/localStorage\.getItem\s*\(\s*['"](balance|userBalance)['"]\s*\)/)) {
      findings.push({
        file: file,
        line: idx + 1,
        code: line.trim(),
        severity: 'HIGH - use backend balance instead'
      });
    }
  });
});

// Report findings
console.log('\n📋 localStorage("balance") Audit Report\n');
console.log('=' .repeat(70));

if (findings.length === 0) {
  console.log('\n✅ No localStorage("balance") usage found!\n');
} else {
  console.log(`\n⚠️  Found ${findings.length} instance(s) of localStorage("balance") usage\n`);
  
  findings.forEach((f, i) => {
    console.log(`${i + 1}. ${f.file}:${f.line}`);
    console.log(`   Severity: ${f.severity}`);
    console.log(`   Code: ${f.code}`);
    console.log();
  });
  
  console.log('=' .repeat(70));
  console.log('\n💡 Recommendation:');
  console.log('Replace localStorage("balance") with one of these approaches:\n');
  console.log('1. For regular users:');
  console.log('   - Use AuthService.fetchUserProfile() to get server balance\n');
  console.log('2. For admin preview:');
  console.log('   - Use GET /api/admin/users/:id to fetch user with balance\n');
  console.log('3. For SSE updates:');
  console.log('   - Listen to "profile_update" event for balance changes\n');
  console.log('4. For local cache (if needed):');
  console.log('   - Use sessionStorage instead of localStorage\n');
  console.log('5. Store balance in global state (window object):');
  console.log('   - window.userBalance or window.AppState.balance\n');
}

console.log('=' .repeat(70));
console.log('\n📚 Files Scanned:');
console.log(`   JS files: ${jsFiles.length}`);
console.log(`   HTML files: ${htmlFiles.length}\n`);
