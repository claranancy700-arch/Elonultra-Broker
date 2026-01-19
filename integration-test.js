#!/usr/bin/env node
/**
 * Integration Testing Suite
 * Comprehensive tests for admin system, transactions, and portfolio management
 * 
 * Prerequisites:
 * - Backend running on port 5001
 * - PostgreSQL database configured and accessible
 * - Admin key set: elonu_admin_key_251104
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:5001';
const ADMIN_KEY = 'elonu_admin_key_251104';
const API_BASE = `${BASE_URL}/api`;

// Test utilities
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  add(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n🧪 ${this.name}\n`);
    console.log('=' .repeat(70));

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (err) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${err.message}`);
        this.failed++;
      }
    }

    console.log('=' .repeat(70));
    console.log(`Results: ${this.passed} passed, ${this.failed} failed\n`);
    return this.failed === 0;
  }
}

// HTTP request helper
async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY,
        ...headers,
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Tests
async function runTests() {
  const tests = new TestRunner('Admin System & Transaction Integration Tests');

  // 1. Connection tests
  tests.add('Server is accessible', async () => {
    const res = await request('GET', '/api/health', null, { 'x-admin-key': '' });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });

  tests.add('Admin key verification works', async () => {
    const res = await request('GET', '/api/admin/verify-key');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  });

  tests.add('Invalid admin key rejected', async () => {
    const res = await request(
      'GET',
      '/api/admin/users',
      null,
      { 'x-admin-key': 'invalid-key' }
    );
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
  });

  // 2. User management tests
  tests.add('Can fetch users list', async () => {
    const res = await request('GET', '/api/admin/users');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response should be array of users');
  });

  tests.add('User list contains required fields', async () => {
    const res = await request('GET', '/api/admin/users');
    if (res.body.length > 0) {
      const user = res.body[0];
      assert(typeof user.id === 'number', 'User should have id field');
      assert(typeof user.email === 'string', 'User should have email field');
      assert(typeof user.balance === 'number', 'User should have balance field');
    }
  });

  // 3. Portfolio tests
  tests.add('Can fetch user portfolio', async () => {
    const usersRes = await request('GET', '/api/admin/users');
    if (usersRes.body.length > 0) {
      const userId = usersRes.body[0].id;
      const res = await request('GET', `/api/admin/users/${userId}/portfolio`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Response should have success: true');
      assert(typeof res.body.assets === 'object', 'Response should have assets object');
    }
  });

  tests.add('Portfolio response includes balance and value', async () => {
    const usersRes = await request('GET', '/api/admin/users');
    if (usersRes.body.length > 0) {
      const userId = usersRes.body[0].id;
      const res = await request('GET', `/api/admin/users/${userId}/portfolio`);
      assert(typeof res.body.balance === 'number', 'Portfolio should include balance');
      assert(typeof res.body.totalValue === 'number', 'Portfolio should include totalValue');
      assert(typeof res.body.assetsValue === 'number', 'Portfolio should include assetsValue');
    }
  });

  // 4. Transaction tests
  tests.add('Can fetch transactions list', async () => {
    const res = await request('GET', '/api/admin/transactions');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body), 'Response should be array of transactions');
  });

  tests.add('Can fetch user transactions', async () => {
    const usersRes = await request('GET', '/api/admin/users');
    if (usersRes.body.length > 0) {
      const userId = usersRes.body[0].id;
      const res = await request('GET', `/api/admin/users/${userId}/transactions`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      // Response could be array or object with transactions field
      const txList = Array.isArray(res.body) ? res.body : res.body.transactions || [];
      assert(Array.isArray(txList), 'Should return array of transactions');
    }
  });

  // 5. Admin operations
  tests.add('Can create transaction', async () => {
    const usersRes = await request('GET', '/api/admin/users');
    if (usersRes.body.length > 0) {
      const userId = usersRes.body[0].id;
      const res = await request('POST', '/api/admin/transactions', {
        user: userId,
        type: 'deposit',
        amount: 100,
        status: 'pending',
      });
      // Should return 200 or 201
      assert(
        res.status === 200 || res.status === 201,
        `Expected 200 or 201, got ${res.status}`
      );
    }
  });

  tests.add('Can update user balance', async () => {
    const usersRes = await request('GET', '/api/admin/users');
    if (usersRes.body.length > 0) {
      const userId = usersRes.body[0].id;
      const currentBalance = usersRes.body[0].balance;
      const newBalance = currentBalance + 100;

      const res = await request('POST', `/api/admin/users/${userId}/set-balance`, {
        amount: newBalance,
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.success === true, 'Should return success: true');
    }
  });

  // 6. Error handling
  tests.add('Invalid user ID returns 400', async () => {
    const res = await request('GET', '/api/admin/users/invalid-id');
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  tests.add('Nonexistent user returns 404', async () => {
    const res = await request('GET', '/api/admin/users/999999');
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
  });

  // 7. Data consistency
  tests.add('Portfolio total value >= balance + assets value', async () => {
    const usersRes = await request('GET', '/api/admin/users');
    if (usersRes.body.length > 0) {
      const userId = usersRes.body[0].id;
      const portfolioRes = await request('GET', `/api/admin/users/${userId}/portfolio`);
      const { balance, assetsValue, totalValue } = portfolioRes.body;

      // Allow small floating point differences
      const calculatedTotal = balance + assetsValue;
      assert(
        Math.abs(totalValue - calculatedTotal) < 0.01,
        `Total value should equal balance + assetsValue. Got ${totalValue}, calculated ${calculatedTotal}`
      );
    }
  });

  // Run all tests
  const allPassed = await tests.run();

  // Summary
  console.log('\n📊 Test Summary\n');
  console.log('Server: ' + BASE_URL);
  console.log('Admin Key: ' + ADMIN_KEY.substring(0, 5) + '...');
  console.log(`Total: ${tests.passed + tests.failed} tests`);
  console.log(`Passed: ${tests.passed}`);
  console.log(`Failed: ${tests.failed}`);

  if (allPassed) {
    console.log('\n✅ All tests passed! Admin system is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
console.log('🚀 Starting Integration Tests\n');
runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
