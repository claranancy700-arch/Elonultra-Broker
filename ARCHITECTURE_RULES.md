# Gold Standard Architecture Rules

## Core Principle
**Database = Single Source of Truth**

All state must originate from the database. Frontend is a consumer, never a generator of truth.

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ADMIN/USER FRONTEND                         │
│  (balanceSync.js polls API, listens to socket.io)           │
└────────────────┬──────────────────────────────────────────┘
                 │ (ONLY API calls, never direct DB)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS API                               │
│  ├── Controllers (handle HTTP)                              │
│  ├── Services (business logic, transactions)                │
│  └── Email/Socket (notifications)                           │
└────────────────┬──────────────────────────────────────────┘
                 │ (transactional, atomic writes)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                       │
│  └── users, trades, transactions, portfolio, etc.          │
│  └── SINGLE SOURCE OF TRUTH                                │
└─────────────────────────────────────────────────────────────┘
```

## ✅ REQUIRED PATTERNS

### 1. Balance Updates (Admin)
```
Admin UI → POST /api/admin/users/{id}/balance/update
           ↓ (API Controller)
           ↓ (Transaction)
           ├─ UPDATE users SET balance = $1
           ├─ INSERT INTO transactions (type='adjustment')
           └─ Emit socket event: admin_adjustment
           ↓
User Sees Update: balanceSync polls /api/auth/me
```

### 2. Simulator/Trade Generation (Backend Job)
```
Scheduled Job: /src/jobs/balanceGrowthSimulator.js
│
├─ SELECT FROM users WHERE sim_enabled=true
├─ For each user (atomic transaction):
│  ├─ Read current balance (locked for update)
│  ├─ Calculate profit (balance * 2.5%)
│  ├─ CREATE trade record
│  ├─ UPDATE users SET balance = new_balance
│  ├─ INSERT INTO transactions (type='simulator')
│  └─ Emit socket event: balance_updated
│
└─ Database updated FIRST, then UI notified
```

### 3. User Views Balance
```
User Dashboard → balanceSync.getBalance()
                 ├─ Check cache (3s max)
                 ├─ If cache stale: fetch /api/auth/me
                 └─ Display only after API confirms
                 
Real-time: Listen to socket.io events
           └─ Refresh balance when notified
```

## ❌ FORBIDDEN PATTERNS

### Never Store Balance in localStorage
```javascript
// ❌ WRONG
localStorage.setItem('balance', newBalance);
const balance = localStorage.getItem('balance');

// ✅ CORRECT
const balance = await BalanceSync.getBalance();
```

### Never Calculate Balance on Frontend
```javascript
// ❌ WRONG
const newBalance = currentBalance + deposit;

// ✅ CORRECT
const response = await fetch('/api/deposits', { method: 'POST', body });
// Let backend calculate and return new balance
```

### Never Update User State from Admin UI
```javascript
// ❌ WRONG
// In admin.js - never modify user's DOM directly
document.getElementById('user-balance').textContent = newAmount;

// ✅ CORRECT
// Make API call, API updates DB, user sees change via balanceSync poll/socket
await fetch('/api/admin/users/123/balance/update', { body });
// balanceSync will fetch the change from API
```

### Never Direct User-to-User Communication
```javascript
// ❌ WRONG
user1.balance = user2.balance + 100;

// ✅ CORRECT
// All changes go through API → DB → back to frontends
```

## Transaction Logging Requirements

Every balance change MUST create a transaction record:

```javascript
INSERT INTO transactions (
  user_id,
  type,              // 'credit', 'debit', 'simulator', 'withdrawal', 'adjustment'
  amount,            // +/- amount
  currency,          // 'USD', 'BTC', etc
  status,            // 'completed', 'pending', 'failed'
  reference,         // Audit trail: 'admin: balance reset', 'simulator: BTC buy 2.5%'
  created_at
)
```

Example:
```sql
-- Admin credits $100
INSERT INTO transactions VALUES (
  user_id: 42,
  type: 'credit',
  amount: 100.00,
  currency: 'USD',
  status: 'completed',
  reference: 'admin: manual credit for demo'
);

-- Simulator generates $50 profit
INSERT INTO transactions VALUES (
  user_id: 42,
  type: 'simulator',
  amount: 50.00,
  currency: 'USD',
  status: 'completed',
  reference: 'simulator: BTC buy 2.5%'
);
```

## API Response Format

All endpoints MUST use standardized response:

```javascript
// Success (200)
{
  "success": true,
  "data": { /* payload */ }
}

// Paginated (200)
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "pages": 10,
    "hasNext": true
  }
}

// Error (400, 403, 500, etc)
{
  "success": false,
  "error": "Error message"
}
```

## Frontend Rules

### Dashboard.js
```javascript
// ✅ Good
async function loadBalance() {
  const balance = await BalanceSync.getBalance();
  document.getElementById('balance').textContent = balance;
}

// ❌ Bad
const balance = localStorage.getItem('balance');
```

### Portfolio.js
```javascript
// ✅ Good
setBalance(amount) {
  // Only update in memory, never localStorage
  this.availableBalance = amount;
}

// ❌ Bad
setBalance(amount) {
  localStorage.setItem('balance', amount); // NO!
}
```

### Markets.js, Transactions.js
```javascript
// ✅ Good - All data fetched from API
const response = await fetch('/api/transactions');
const transactions = response.data;

// ❌ Bad - Never assume frontend has correct state
const transactions = JSON.parse(localStorage.getItem('transactions'));
```

## Real-Time Update Flow

```
Backend emits socket.io event
    ↓
balanceSync.listenToSocketEvents()
    ↓
Refreshes from /api/auth/me
    ↓
Updates UI elements
    ↓
User sees change immediately
```

## Email Notifications

Every significant event MUST trigger email:
- Balance update (admin credit, simulator profit)
- Simulator start/stop
- Withdrawal request
- Deposit confirmation
- Trade alerts

Service: `src/services/email.service.js`

```javascript
await emailService.sendBalanceUpdateEmail(
  user,
  oldBalance,
  newBalance,
  'simulator: generated $50 profit'
);
```

## Endpoints Summary

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me` (single source of balance)

### Admin
- `POST /api/admin/users/:id/balance/update` (set balance)
- `POST /api/admin/users/:id/credit` (add amount)
- `GET/POST /api/admin/config/deposit-addresses` (manage wallets)

### Trades
- `GET /api/trades` (user's trades)
- `GET /api/trades?userId=X` (admin view all)

### Transactions
- `GET /api/transactions` (audit trail)

### Config
- `GET/POST /api/admin/config/profit-rate` (simulator rate)
- `GET/POST /api/admin/config/simulator-settings`

## Testing Checklist

- [ ] Admin updates balance → DB updated → User sees change via API
- [ ] Simulator runs → Trade created → Transaction logged → Balance updated
- [ ] Email sent for all balance changes
- [ ] Socket.io notifies user in real-time
- [ ] Refresh page → balance still correct (from API, not localStorage)
- [ ] Two admins update same user → both changes logged separately
- [ ] Logout → all localStorage cleared → balanceSync stops

---

**Remember: Database is the source of truth. Frontend just reflects it.**
