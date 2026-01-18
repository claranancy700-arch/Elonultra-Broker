#!/usr/bin/env node
/**
 * Quick test script for admin endpoints
 * Tests API connectivity without requiring full database
 */

const http = require('http');

const ADMIN_KEY = 'elonu_admin_key_251104';
const BASE_URL = 'http://localhost:5001';

const endpoints = [
  { method: 'GET', path: '/api/health', requiresKey: false, name: 'Health check' },
  { method: 'GET', path: '/api/admin/users', requiresKey: true, name: 'List users' },
  { method: 'GET', path: '/api/admin/transactions', requiresKey: true, name: 'List transactions' },
  { method: 'GET', path: '/api/admin/testimonies', requiresKey: true, name: 'List testimonies' },
  { method: 'GET', path: '/api/admin/verify-key', requiresKey: true, name: 'Verify admin key' },
];

async function testEndpoint(method, path, requiresKey) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    if (requiresKey) {
      options.headers['x-admin-key'] = ADMIN_KEY;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          body: data,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        status: null,
        statusText: err.message,
        body: null,
        success: false,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: null,
        statusText: 'Timeout - server not responding',
        body: null,
        success: false,
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Admin System Endpoints\n');
  console.log(`Admin Key: ${ADMIN_KEY}`);
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log('=' .repeat(60) + '\n');

  let passCount = 0;
  let failCount = 0;

  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}... `);

    const result = await testEndpoint(endpoint.method, endpoint.path, endpoint.requiresKey);

    if (result.success) {
      console.log(`✅ ${result.status} ${result.statusText}`);
      if (result.body) {
        try {
          const parsed = JSON.parse(result.body);
          console.log('   Response:', JSON.stringify(parsed, null, 2).split('\n')[0] + '...');
        } catch (e) {
          console.log('   Response:', result.body.substring(0, 60) + '...');
        }
      }
      passCount++;
    } else {
      console.log(`❌ Failed: ${result.statusText}`);
      failCount++;
    }
    console.log();
  }

  console.log('=' .repeat(60));
  console.log(`\nResults: ${passCount} passed, ${failCount} failed\n`);

  if (failCount > 0) {
    console.log('💡 Troubleshooting tips:');
    console.log('1. Ensure backend is running: npm run server:dev');
    console.log('2. Check database connection (see ADMIN_SYSTEM_SETUP.md)');
    console.log('3. Verify ADMIN_KEY in .env');
    console.log('4. Check firewall/network settings\n');
  } else {
    console.log('✅ All tests passed! Admin system is ready.\n');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runTests();
