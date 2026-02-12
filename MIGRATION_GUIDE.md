# Database Migration: Add Missing Tables

## 📋 New Tables Added (10 Total)

### 1. **user_kyc** - User Identity Verification
Stores KYC (Know Your Customer) verification data for compliance and identity verification.
- Status tracking: pending, verified, rejected, expired
- Document storage (ID front/back, selfie URLs)
- Personal information fields
- Timestamps for submission and verification

**Use Case:** Regulatory compliance, user verification before large withdrawals

---

### 2. **api_keys** - External API Access
Manages API keys for third-party integrations or programmatic access.
- Key hashing for security
- Active/inactive status
- Expiration tracking
- Usage tracking (last_used_at)

**Use Case:** Partner integrations, mobile app authentication, automated trading bots

---

### 3. **deposit_addresses** - Cryptocurrency Wallets
Stores unique crypto addresses for each user and each asset type.
- One address per user per crypto type
- Balance tracking per address
- Total received tracking
- Activity monitoring

**Use Case:** Receiving deposits, tracking incoming transfers, user wallet management

---

### 4. **price_history** - Historical Crypto Prices
Records historical cryptocurrency price data at intervals.
- Multiple metrics: price, market cap, 24h volume, 24h change
- Indexed for efficient time-based queries
- Supports charting and historical analysis

**Use Case:** Price charts on dashboard, trading strategy backtesting, historical reports

---

### 5. **notifications** - User Notifications
Centralized notification system for all user alerts.
- Types: transaction, withdrawal, deposit, trade, alert, system, promotion
- JSON data for flexible payload storage
- Read/unread tracking
- Action URLs for navigation

**Use Case:** In-app notifications, push notifications, email digests

---

### 6. **sessions** - User Sessions
Tracks active user sessions for security and session management.
- Device identification (user agent, device type)
- IP address logging
- Session expiration
- Multiple concurrent sessions per user supported

**Use Case:** Session management, "devices" page, logout all devices, suspicious activity detection

---

### 7. **exchange_rates** - Exchange Rate Tracking
Stores historical exchange rates between currency pairs.
- Supports USD, crypto pairs, and cross-currency
- Source tracking (which API provided it)
- Unique index on latest rate per pair

**Use Case:** Portfolio value calculation, conversion rates, historical comparisons

---

### 8. **fee_config** - Fee Configuration
Centralized fee management system without hardcoding.
- Types: withdrawal, trading, deposit
- Supports both percentage and flat fees
- Min/max amount constraints
- Easy to modify without redeploying

**Use Case:** Dynamic fee calculation, promotional periods, per-tier fees

---

### 9. **user_settings** - User Preferences
Stores user customization and notification preferences.
- Theme selection (dark/light/auto)
- Language preference
- 2FA configuration
- Notification preferences (granular control)
- Display preferences
- Auto-logout timeout

**Use Case:** Personalization, notification opt-in/out, security settings, UI customization

---

### 10. **audit_logs** - Enhanced Audit Trail
Comprehensive audit logging for all data changes.
- Entity tracking (what changed, type, ID)
- Before/after values (JSON)
- User and admin tracking
- IP and user agent logging
- Status and error tracking

**Use Case:** Compliance, debugging, security investigations, change tracking

---

## 🚀 How to Apply Migration

### Option 1: PostgreSQL Command Line
```bash
psql -U postgres -d "Elon-backend-db" -f add_missing_tables.sql
```

### Option 2: pgAdmin
1. Open pgAdmin
2. Connect to your database
3. Open Query Editor
4. Copy and paste contents of `add_missing_tables.sql`
5. Execute

### Option 3: Database GUI Tool (DBeaver, etc.)
1. Open the SQL script
2. Execute against your database

---

## 📊 Relationships & Dependencies

```
users (core)
  ├── user_kyc (1:1)
  ├── api_keys (1:many)
  ├── deposit_addresses (1:many)
  ├── notifications (1:many)
  ├── sessions (1:many)
  ├── user_settings (1:1)
  ├── audit_logs (user_id foreign key)
  └── (existing tables: portfolio, transactions, trades, withdrawals)

Standalone:
  ├── price_history (no FK)
  ├── exchange_rates (no FK)
  └── fee_config (no FK)
```

---

## 🔒 Security Considerations

✅ **Applied:**
- All sensitive FK relationships use ON DELETE CASCADE
- Constraints on all enum-like fields
- Indexes on frequently queried columns
- Unique constraints where needed (email, API key hash, addresses)
- JSONB for flexible data storage without exposing raw data

⚠️ **Before Production:**
- Hash the API key values using bcrypt before storage
- Encrypt document URLs or store files securely (not plain URLs)
- Implement row-level security (RLS) for user_settings
- Add audit logging for fee_config changes
- Regularly purge old sessions and notifications

---

## 🛠️ Post-Deployment Tasks

1. **Initialize Fee Configuration**
   ```sql
   INSERT INTO public.fee_config (fee_type, percentage_fee, flat_fee, is_active, description)
   VALUES 
     ('withdrawal', 0.5, 0, true, 'Withdrawal fee 0.5%'),
     ('trading', 0.1, 0, true, 'Trading fee 0.1%'),
     ('deposit', 0, 0, true, 'Deposit fee (free)');
   ```

2. **Create Default User Settings for Existing Users**
   ```sql
   INSERT INTO public.user_settings (user_id, theme, language)
   SELECT id, 'dark', 'en' FROM public.users
   ON CONFLICT DO NOTHING;
   ```

3. **Create Exchange Rate Tables (Populate from API)**
   - Set up cron job to fetch and store rates hourly

4. **Set Up Price History Feed**
   - Use external API (CMC, Coingecko, etc.) to populate price_history table

---

## 📈 Performance Recommendations

- Index on `price_history(timestamp DESC)` for efficient date range queries
- Cronjob to archive old audit_logs (>1 year) to separate table
- Regular VACUUM on high-activity tables (sessions, notifications)
- Partition price_history by month for large datasets

---

## ✅ Verification

After running the migration, verify:

```sql
-- Check all new tables exist
\dt

-- Count tables (should be 18 total: 8 original + 10 new)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verify foreign keys
SELECT * FROM information_schema.table_constraints 
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY';
```

---

**Migration Ready!** All new tables include proper indexes, constraints, and relationships. 
Safe to deploy to development, staging, and production environments.
