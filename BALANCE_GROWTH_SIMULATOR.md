# Balance Growth Simulator + Trade History Generator
**Implementation Complete** ✅

## Overview
A sophisticated hourly balance growth simulator that generates realistic trade history, boosts user portfolios up to 2.5% per hour, and runs only Monday-Friday. Features atomic database operations to prevent race conditions.

## Architecture

### 1. **Core Simulator: `src/jobs/balanceGrowthSimulator.js`**

**Key Features:**
- ✅ Hourly execution on Mon-Fri only
- ✅ Atomic balance reads (no caching)
- ✅ 2.5% hourly boost (randomly between 0.5-2.5%)
- ✅ Generates simulated trade records with realistic data
- ✅ Updates portfolio allocation
- ✅ Transaction-based to prevent race conditions
- ✅ Admin can change balance anytime without conflicts

**How It Works:**
1. Scheduler triggers every hour (node-schedule) 
2. Checks if trading day (Mon-Fri)
3. Fetches all active users with `sim_enabled=true`
4. For each user:
   - BEGIN transaction
   - READ current balance (locked for update)
   - CALCULATE trade size (2.5% of current balance)
   - GENERATE simulated trade (random type, asset, price)
   - UPDATE balance (+boost amount)
   - UPDATE portfolio allocation
   - COMMIT transaction
5. Logs all trades for audit trail

**Atomic Pattern:**
```javascript
BEGIN;
SELECT balance FROM users WHERE id=$1 FOR UPDATE;
INSERT INTO trades (...);
UPDATE users SET balance=$1 WHERE id=$2;
UPDATE portfolio SET ...;
COMMIT;
```

### 2. **Admin API Endpoints: `src/routes/admin.js`**

#### `POST /api/admin/users/:id/simulator/trigger-growth`
Manually trigger balance growth for a specific user
- Returns: Success message and trade details

#### `POST /api/admin/users/:id/balance/update`
Admin can update user balance directly
- Body: `{ amount: number, reason: string }`
- Logs transaction for audit trail
- Returns: Old balance, new balance, confirmation

#### `GET /api/admin/users/:id/growth-trades`
Fetch all balance growth trades for a user
- Query param: `limit` (default 50)
- Returns: Array of all simulated trades

#### `GET /api/admin/users/:id/growth-stats`
Get comprehensive growth statistics
- Returns:
  - Total growth trades count
  - Total volume traded
  - Average boost per trade
  - Peak balance reached
  - Lowest balance recorded

### 3. **Admin UI Updates: `admin.html` + `js/admin.js`**

**New "Growth Trades" Tab with:**
- 📊 **Stats Cards:**
  - Total Growth Trades (count)
  - Total Volume ($)
  - Avg Boost per Trade (%)
  - Peak Balance ($)

- 📋 **Trade History Table:**
  - Date | Type | Asset | Amount | Price | Total | Balance Before | Balance After | Boost %

- 🔘 **Actions:**
  - "Refresh" button to reload trades and stats
  - "Trigger Growth Now" button for manual execution

**Functions Added:**
- `loadGrowthTrades()` - Fetches and displays growth trades + stats
- `triggerGrowthNow()` - Manually trigger growth for selected user

### 4. **Database**

**Trades Table Columns Used:**
```
- user_id: User being processed
- type: buy/sell (randomized)
- asset: BTC/ETH/USDT/USDC/XRP/ADA
- amount: Calculated as 2.5% / price
- price: Current asset price
- total: amount * price
- balance_before: Balance before boost
- balance_after: Balance after boost
- is_simulated: true (marks as simulator trade)
- created_at: Timestamp
```

**Portfolio Table Updates:**
- Proportional allocation across 6 coins
- Locked during transaction for consistency

## Key Rules Implemented

✅ **Every Hour Execution**
- Node-schedule: `0 * * * *` (every hour at minute 0)

✅ **Monday-Friday Only**
- `isTradingDay()` checks day 1-5 (Mon-Fri)

✅ **Always Read Current Balance**
- No in-memory caching
- Fresh read from DB each cycle
- `FOR UPDATE` lock prevents race conditions

✅ **2.5% Hourly Boost**
- Random boost: 0.5% - 2.5%
- Applied to CURRENT balance (not cached)
- Updates atomically

✅ **24-Hour Span Pattern**
- Day 1: Balance 100 → +2.5%/hr × 24h
- Day 2: Starts fresh with new balance after 24h
- Each day is independent growth cycle

✅ **Admin Control**
- Can update balance anytime
- Changes logged in transactions
- Manual trigger for immediate growth
- View all generated trades

## What Prevents Race Conditions

1. **Database Transactions (ACID)**
   - BEGIN/COMMIT ensures atomicity
   - `FOR UPDATE` lock prevents concurrent modifications

2. **No In-Memory State**
   - Always read fresh from DB
   - No cached balance values

3. **Single Scheduler**
   - One hourly job (not per-user loops)
   - Sequential processing

## How Admin Can Override

1. Use **"Set Balance"** button:
   - Updates balance to exact amount
   - Logs as transaction for audit
   - Next simulator run uses new balance

2. Use **"Trigger Growth Now"**:
   - Immediate balance boost
   - Creates trade immediately
   - Doesn't wait for hourly schedule

3. View **Growth Trades tab**:
   - See all generated trades
   - View statistics and history
   - Verify simulator is working

## Trade Generation Example

```
User balance: $10,000
Time: Monday, 9:00 AM

→ Read: balance = $10,000 (locked)
→ Trade size: $10,000 × 2.5% = $250
→ Random boost: 1.8% = $180
→ Generate trade:
   - Type: buy
   - Asset: ETH
   - Amount: 0.081 ETH (@ $2,200)
   - Total: $180
→ New balance: $10,180
→ Update portfolio (add 0.081 ETH)
→ Log trade with is_simulated=true
```

## Configuration

Set environment variables to control:
```bash
BALANCE_GROWTH_ENABLED=true/false    # Enable/disable simulator
DEBUG_SIMULATOR=true/false            # Enable debug logging
```

## Dependencies Added
- `node-schedule@^1.3.2` - For hourly scheduling

## Next Steps (Optional)

1. Add UI controls to pause/resume per-user simulator
2. Customize boost percentage per user tier
3. Add email notifications for balance milestones
4. Create charts/graphs for growth visualization
5. Export trade history as CSV/PDF for users

---

**Status:** ✅ Production Ready
**Last Updated:** January 14, 2026
**Tested On:** Windows PowerShell, Node.js v22.20.0
