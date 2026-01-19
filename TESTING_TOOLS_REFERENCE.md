# 🧪 Testing Tools & Scripts Reference

Quick reference guide for all available testing scripts and how to use them.

## Quick Start

```bash
# 1. Check setup
node diagnose-admin.js

# 2. Start backend (Terminal 1)
npm run server:dev

# 3. Run tests (Terminal 2)
node test-admin.js
node integration-test.js
node audit-balance-usage.js
node verify-transaction-logging.js
```

---

## Testing Scripts

### 1. 🔍 diagnose-admin.js
**What it does**: Checks configuration and setup

**Run**: 
```bash
node diagnose-admin.js
```

**Checks**:
- ✅ Frontend files (admin.html, js/admin.js)
- ✅ Backend files (src/routes/admin.js, src/server.js)
- ✅ .env configuration
- ✅ Admin key setup
- ✅ Required functions

**Output**: Setup checklist and status report

**Use when**: Starting work or troubleshooting setup

---

### 2. 🌐 test-admin.js
**What it does**: Tests API endpoint connectivity

**Run**:
```bash
npm run server:dev
# (in another terminal)
node test-admin.js
```

**Tests**:
- ✅ Health endpoint
- ✅ Admin users endpoint
- ✅ Admin transactions endpoint
- ✅ Admin testimonies endpoint  
- ✅ Admin key verification

**Output**: Endpoint status summary

**Use when**: Verifying backend is running correctly

---

### 3. 🔄 integration-test.js
**What it does**: Comprehensive end-to-end integration tests

**Prerequisites**:
- PostgreSQL database running
- Backend server running
- Database has data (or will test with empty DB)

**Run**:
```bash
npm run server:dev
# (in another terminal)
node integration-test.js
```

**Tests** (15+):
- Connection & authentication (3 tests)
- User management (2 tests)
- Portfolio operations (2 tests)
- Transaction operations (2 tests)
- Admin operations (2 tests)
- Error handling (2 tests)
- Data consistency (1 test)

**Output**: Pass/fail report with test details

**Use when**: Verifying full system functionality

---

### 4. 📋 audit-balance-usage.js
**What it does**: Audits code for localStorage('balance') usage

**Run**:
```bash
node audit-balance-usage.js
```

**Checks**:
- ✅ All .js files in js/
- ✅ All .html files in root
- ✅ localStorage.getItem('balance')
- ✅ localStorage.getItem("balance")

**Output**: List of findings with recommendations

**Use when**: Code review or quality assurance

---

### 5. ✔️ verify-transaction-logging.js
**What it does**: Verifies transaction logging implementation

**Run**:
```bash
node verify-transaction-logging.js
```

**Checks**:
- ✅ Transaction table schema
- ✅ Simulator logging
- ✅ Admin routes logging
- ✅ Withdrawal logging
- ✅ Trade logging
- ✅ All transaction types

**Output**: Logging coverage report

**Use when**: Verifying logging is working

---

## Test Results Interpretation

### 🟢 Green (Passing)

```
✅ Test name
```

Means the test passed and that feature is working correctly.

### 🔴 Red (Failing)

```
❌ Test name
   Error: Specific error message
```

Means the test failed. Check the error message:
- **"Cannot connect"** → Backend not running
- **"Invalid admin key"** → Wrong key or not in .env
- **"404 Not Found"** → Endpoint not defined
- **"Database connection"** → PostgreSQL issue

---

## Common Commands

### Run All Diagnostics

```bash
echo "=== Setup Check ===" && \
node diagnose-admin.js && \
echo "" && \
echo "=== Code Audit ===" && \
node audit-balance-usage.js && \
echo "" && \
echo "=== Logging Verification ===" && \
node verify-transaction-logging.js
```

### Run All Tests

```bash
# Start backend first
npm run server:dev

# In another terminal:
echo "=== Endpoint Tests ===" && \
node test-admin.js && \
echo "" && \
echo "=== Integration Tests ===" && \
node integration-test.js
```

### Test with Timeout (for slower systems)

```bash
timeout 30 node integration-test.js
```

---

## Troubleshooting Test Failures

### Test: "Cannot connect to server"

**Problem**: Backend is not running

**Solution**:
```bash
npm run server:dev
# Should show: ✓ Server listening on port 5001
```

### Test: "ENOTFOUND dpg-d5kluhpr0fns738l1gug-a"

**Problem**: PostgreSQL database is not accessible

**Solution**: See ADMIN_SYSTEM_SETUP.md for database setup options

### Test: "Invalid admin key"

**Problem**: ADMIN_KEY not set in .env or wrong value

**Solution**:
```bash
# Add to .env:
ADMIN_KEY=elonu_admin_key_251104

# Verify it's set:
grep ADMIN_KEY .env
```

### Test: "Timeout - server not responding"

**Problem**: Server is running but not responding quickly

**Solution**:
1. Check server logs for errors
2. Check database connectivity
3. Restart backend: `npm run server:dev`

---

## Test Matrix

Which test to use for different scenarios:

| Scenario | Script | Time |
|----------|--------|------|
| First time setup | diagnose-admin.js | <1s |
| Backend connectivity | test-admin.js | 5s |
| Full system test | integration-test.js | 15s |
| Code quality | audit-balance-usage.js | <1s |
| Logging check | verify-transaction-logging.js | <1s |
| Full verification | All + manual | 30s |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Admin System Tests

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run server:dev &
      - run: sleep 5
      - run: node integration-test.js
```

---

## Performance Tips

### Speed Up Tests

1. **Skip non-essential tests**: Comment out in test files
2. **Reduce iterations**: Modify loop counts in tests
3. **Use local database**: Faster than remote DB
4. **Parallel execution**: Run independent tests in parallel

### Monitor System During Tests

```bash
# Terminal 1
npm run server:dev

# Terminal 2
node integration-test.js

# Terminal 3 (watch resources)
watch 'top -bn1 | grep "^%\|^PID\|node" | head -5'
```

---

## Test Reports

Each test script generates a report:

### diagnose-admin.js Report
```
Setup Checklist:
✅ Frontend files exist
✅ Backend files exist
✅ .env file exists
```

### test-admin.js Report
```
Testing /api/admin/users... ✅ 200 OK
Testing /api/admin/transactions... ✅ 200 OK
Results: 5 passed, 0 failed
```

### integration-test.js Report
```
Results: 15 passed, 0 failed

✅ All tests passed! Admin system is working correctly.
```

### audit-balance-usage.js Report
```
Found 4 instance(s) of localStorage("balance") usage

1. js/transactions.js:200
2. js/transactions.js:213
```

### verify-transaction-logging.js Report
```
📈 Transaction Logging Status: 6/7 types found

✅ deposit      - User deposits
✅ withdrawal   - User withdrawals
✅ adjustment   - Admin balance adjustments
```

---

## Script Status

| Script | Status | Purpose |
|--------|--------|---------|
| diagnose-admin.js | ✅ Working | Configuration check |
| test-admin.js | ✅ Working | Endpoint tests |
| integration-test.js | ✅ Working | End-to-end tests |
| audit-balance-usage.js | ✅ Working | Code audit |
| verify-transaction-logging.js | ✅ Working | Logging verification |

---

## Documentation Links

- **Setup Guide**: [ADMIN_SYSTEM_SETUP.md](ADMIN_SYSTEM_SETUP.md)
- **Testing Guide**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Bug Report**: [INTEGRATION_TESTING_REPORT.md](INTEGRATION_TESTING_REPORT.md)
- **Quick Reference**: [ADMIN_QUICK_REFERENCE.md](ADMIN_QUICK_REFERENCE.md)
- **Implementation Details**: [ADMIN_IMPLEMENTATION.md](ADMIN_IMPLEMENTATION.md)

---

**Last Updated**: 2025-01-18

**Status**: All testing tools ready and functional ✅

**Test Coverage**: Configuration ✅ | Endpoints ✅ | Integration ✅ | Code Quality ✅ | Logging ✅
