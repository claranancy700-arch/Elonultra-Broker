# Balance and Portfolio Value Sync — Implementation Summary

## Changes Made

### 1. **Backfill Migration:** `scripts/backfill_usdt_to_balance.js`
- **Purpose:** One-time migration to credit users for completed USD/USDT deposits
- **Action:** Summed all completed transactions with currency IN ('USD','USDT') and added amounts to `users.balance` and `users.portfolio_value`
- **Result:** User 1 credited $1035 (from completed USDT admin-credit)
- **Status:** ✅ Applied successfully at 2026-02-12 23:03:24 UTC

### 2. **Portfolio Value Sync Migration:** `scripts/sync_portfolio_value.js`
- **Purpose:** Ensure `users.portfolio_value` always equals `users.balance`
- **Business Rule:** Available Balance = Portfolio Value = Total Assets
- **Action:** Updated all users where portfolio_value differs from balance to match
- **Result:** All users already synced (no additional updates needed after backfill)
- **Status:** ✅ Applied successfully at 2026-02-13 01:36:24 UTC

### 3. **Code Changes**

#### `src/routes/admin.js` — Admin Credit Endpoint
- **Change:** Treat USDT like USD
- **Before:** `if (curr === 'USD')`
- **After:** `if (curr === 'USD' || curr === 'USDT')`
- **Effect:** Admin credits in USDT now update `users.balance` directly (not just portfolio columns)
- **Status:** ✅ Implemented for future transactions

#### `src/routes/auth.js` — GET /me Endpoint
- **Change:** Return `portfolio_value` in user object
- **Before:** Query only `SELECT ... balance ...`
- **After:** Query `SELECT ... balance, portfolio_value ...`
- **Effect:** Frontend receives both fields; enables display of available balance explicitly
- **Status:** ✅ Implemented

#### `src/server.js` — Deprecation Warning Suppression
- **Change:** Suppress Node.js deprecation warning DEP0060 (util._extend)
- **Method:** Added process-level warning filter to ignore DEP0060
- **Effect:** Warning no longer appears in console during startup
- **Status:** ✅ Implemented (suppression active when server starts)

## Current State

### Database (verified)
```
User 1: balance = 1035.00000000, portfolio_value = 1035.00000000  ✅
User 2: balance = 0.00000000,    portfolio_value = 0.00000000     ✅
```

### Business Logic
- All future USDT admin credits → `users.balance` (same as USD)
- Other cryptocurrencies (BTC, ETH, USDC, XRP, ADA) → `portfolio` columns only
- `portfolio_value` always kept in sync with `balance` via code
- Deprecation warnings suppressed

### Endpoints Verified
- `/api/health` ✅ (returns 200)
- `/api/auth/me` ✅ (now includes `portfolio_value`)
- `/api/admin/credit` ✅ (USDT now treated as USD)

## Testing Commands

To verify the changes locally:

```bash
# Check current balances
node -e "const db=require('./src/db/index.js'); (async()=>{const r=await db.query('SELECT id,email,balance,portfolio_value FROM users'); console.log(JSON.stringify(r.rows,null,2)); process.exit(0);})()"

# Check migration history
node -e "const db=require('./src/db/index.js'); (async()=>{const r=await db.query('SELECT * FROM applied_migrations ORDER BY applied_at DESC'); console.log(JSON.stringify(r.rows,null,2)); process.exit(0);})()"

# Test health endpoint
curl http://localhost:5001/api/health
```

## Deployment Notes

1. **Database Migrations:** Both migrations have been marked as applied and will not re-run
2. **Code Changes:** Update `src/routes/admin.js`, `src/routes/auth.js`, `src/server.js` on production
3. **No Data Loss:** All changes are additive; existing data preserved
4. **Backward Compatible:** Existing endpoints still work; only behavior of USDT admin credits changes

## Future Work

If new deposit currencies are added:
- Update `admin.js` credit endpoint to specify which currencies update `users.balance` vs. `portfolio` columns
- Consider adding a config table `currency_balance_mapping` to control this behavior
