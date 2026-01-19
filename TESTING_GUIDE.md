# Testing Guide - Admin System & Integration Tests

## Overview

This guide provides comprehensive testing procedures for the admin system, transaction logging, and portfolio management features.

## Prerequisites

- Node.js installed
- PostgreSQL database accessible and configured
- Backend server running on port 5001
- Admin key: `elonu_admin_key_251104`

## Available Testing Scripts

### 1. Diagnostic Tests

**Purpose**: Verify configuration and file structure

```bash
node diagnose-admin.js
```

**Checks**:
- Frontend files exist
- Backend files exist
- .env configuration
- Required functions
- Admin key setup

### 2. Endpoint Tests

**Purpose**: Test all admin API endpoints connectivity

```bash
# Ensure backend is running first:
npm run server:dev

# In another terminal:
node test-admin.js
```

**Tests**:
- Health endpoint
- Admin users endpoint
- Admin transactions endpoint
- Admin testimonies endpoint
- Admin key verification

### 3. Balance Usage Audit

**Purpose**: Find localStorage balance usage that should use server

```bash
node audit-balance-usage.js
```

**Output**:
- Lists all localStorage('balance') usage
- Severity assessment
- Recommendations for fixes

### 4. Transaction Logging Verification

**Purpose**: Verify transaction logging is working

```bash
node verify-transaction-logging.js
```

**Checks**:
- Transaction table schema
- Simulator logging
- Admin routes logging
- Withdrawal logging
- Trade logging
- Coverage of transaction types

### 5. Integration Tests

**Purpose**: Comprehensive end-to-end tests

```bash
# Ensure both backend AND database are running:
npm run server:dev

# In another terminal:
node integration-test.js
```

**Test Categories**:
- Connection & Authentication
- User Management
- Portfolio Operations
- Transaction Management
- Admin Operations
- Error Handling
- Data Consistency

## Manual Testing Workflow

### Step 1: Setup

```bash
# Terminal 1 - Start Backend
npm run server:dev

# Terminal 2 - Start Frontend (if needed)
npm start

# Terminal 3 - Run Tests
node diagnose-admin.js
```

### Step 2: Verify Configuration

```bash
node diagnose-admin.js
```

Expected output:
```
✅ admin.html (39.77 KB)
✅ js/admin.js (46.78 KB)
✅ src/routes/admin.js (43.64 KB)
✅ .env exists
✅ ADMIN_KEY configured
```

### Step 3: Test Endpoints

```bash
node test-admin.js
```

Expected output:
```
✅ Health check (200 OK)
✅ List users (200 OK)
✅ List transactions (200 OK)
✅ Verify admin key (200 OK)
```

### Step 4: Integration Tests

```bash
node integration-test.js
```

Expected output:
```
✅ Server is accessible
✅ Admin key verification works
✅ Can fetch users list
✅ Can fetch user portfolio
✅ Can fetch transactions list
... (more tests)
Results: 15 passed, 0 failed
```

## Browser Testing

### 1. Open Admin Panel

```
http://localhost:8080/admin.html
```

### 2. Enter Admin Key

- Copy key: `elonu_admin_key_251104`
- Paste in "Admin Key" input field
- Click "Load Users"

### 3. Test User Management

- [ ] Users list loads
- [ ] User details display correctly
- [ ] Portfolio displays with values
- [ ] Balance shows correct amount

### 4. Test Portfolio Display

**Issue**: Portfolio showing $0.00 for all users

**Fix Applied**:
- Updated admin.js to handle `{ success: true, assets: {...} }` response
- Backend now returns `balance`, `assetsValue`, and `totalValue`
- Frontend now uses server balance instead of localStorage

**Verification**:
1. Load a user with holdings
2. Portfolio cards should show:
   - Total Portfolio Value = balance + assets value
   - Individual asset holdings
   - 24h change (if available)

### 5. Test Transaction Management

- [ ] Transactions tab loads data
- [ ] Can view All transactions
- [ ] Can filter by Deposits
- [ ] Can filter by Withdrawals
- [ ] Can filter by Trades
- [ ] Can add new transaction
- [ ] Can edit existing transaction
- [ ] Can delete transaction

### 6. Test Testimony Management

- [ ] Testimonies load
- [ ] Can approve testimony
- [ ] Can delete testimony

### 7. Test Simulator Controls

- [ ] Can start simulator
- [ ] Can pause simulator
- [ ] Status updates correctly

### 8. Test Balance Management

- [ ] Can enter amount
- [ ] Can apply new balance
- [ ] Balance updates in display

## Automated Test Coverage

### What's Tested

| Feature | Test Script | Coverage |
|---------|-------------|----------|
| Configuration | diagnose-admin.js | File structure, .env, keys |
| Endpoints | test-admin.js | Connectivity, authentication |
| API Responses | integration-test.js | Status codes, response format |
| User Data | integration-test.js | User list, profile, balance |
| Portfolio | integration-test.js | Assets, values, calculations |
| Transactions | integration-test.js | List, create, fetch by user |
| Data Consistency | integration-test.js | Portfolio math, balance accuracy |
| Code Quality | audit-balance-usage.js | localStorage usage patterns |
| Logging | verify-transaction-logging.js | Transaction type logging |

### What's NOT Tested (Manual Only)

- UI rendering and layout
- CSS styling and themes
- Real-time updates (SSE)
- Browser compatibility
- Mobile responsiveness
- Long-running simulator behavior
- High-load performance

## Common Issues & Fixes

### Issue: "Cannot connect to server"

**Cause**: Backend not running

**Fix**:
```bash
npm run server:dev
```

### Issue: "Admin key not configured"

**Cause**: ADMIN_KEY not in .env

**Fix**:
```bash
# Add to .env:
ADMIN_KEY=elonu_admin_key_251104
```

### Issue: "Database connection failed"

**Cause**: PostgreSQL not accessible

**Fix**: See ADMIN_SYSTEM_SETUP.md for database setup options

### Issue: Portfolio showing $0.00

**Status**: ✅ FIXED in this iteration

**Root Cause**: Frontend expected different response format

**Solution Applied**:
1. Updated backend to return `balance` and `totalValue`
2. Updated admin.js to handle correct response format
3. Added proper portfolio value calculation

### Issue: Balance not updating

**Cause**: Using localStorage balance without server sync

**Fix**: Updated to fetch balance from server first, localStorage as fallback

## Performance Monitoring

### Database Query Performance

Check slow queries:
```sql
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Transaction Table Size

```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('transactions')) as size,
  COUNT(*) as row_count
FROM transactions;
```

### Optimize Indexes

Ensure these indexes exist for performance:
```sql
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
```

## Reporting Issues

When reporting test failures, include:

1. **Test output**: Full error message
2. **Environment**: Node version, database version
3. **Setup**: Command used to start backend
4. **Timing**: When it started failing
5. **Reproducible**: Steps to reproduce
6. **Logs**: Backend server logs if available

### Example Issue Report

```
Test: Portfolio showing $0.00

Status: ✅ FIXED

Files Changed:
- js/admin.js (updated portfolio response handling)
- src/routes/admin.js (added balance and value calculations)

Verification:
- Run: node integration-test.js
- Check: "Portfolio response includes balance and value" test passes
```

## Next Steps

1. Run all diagnostic scripts to verify setup
2. Start backend and run integration tests
3. Open admin panel and perform manual tests
4. Report any issues with full details

---

**Last Updated**: 2025-01-18

**Status**: Integration testing suite ready

**Test Coverage**: 8+ automated tests + manual verification workflow
