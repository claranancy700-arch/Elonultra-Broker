# Admin System Setup & Testing Guide

## Overview
The admin system allows authorized administrators to manage users, view/edit transactions, manage testimonies, and control portfolio simulators. It's built with:

- **Frontend**: `admin.html` + `js/admin.js`
- **Backend**: Node.js Express routes at `src/routes/admin.js`
- **Authentication**: Admin key passed via `x-admin-key` header
- **Database**: PostgreSQL (must be accessible for backend to run)

## Current Status

✅ **COMPLETED**:
- admin.html fully built with light theme
- admin.js with complete API integration
- Backend routes defined for all admin functions
- Admin key verification system in frontend modal
- Inline message system for notifications
- Transaction management (tabbed interface)
- Testimony management
- User management

❌ **BLOCKER**:
- PostgreSQL database at `dpg-d5kluhpr0fns738l1gug-a` is not reachable (network/firewall issue)
- Backend server cannot start due to database connection failure
- This is a **database infrastructure issue**, not a code issue

## Admin Key

The admin key is configured in `.env`:

```
ADMIN_KEY=elonu_admin_key_251104
ADMIN_API_KEY=elonu_admin_key_251104
```

Use this key when:
1. Logging into the admin interface
2. Making API requests with `x-admin-key` header

## Setup Steps

### 1. Fix Database Connection (CRITICAL)

The backend requires PostgreSQL to be accessible. Choose ONE:

**Option A: Fix the existing PostgreSQL database**
- Ensure `dpg-d5kluhpr0fns738l1gug-a` is accessible from your network
- Check firewall/VPN settings
- Verify DATABASE_URL in `.env` is correct:
  ```
  DATABASE_URL=postgresql://elon_backend_db:tQX30fUtkLyi7X6IOGFJAjGAuPqgm0qu@dpg-d5kluhpr0fns738l1gug-a/elon_backend_db
  ```

**Option B: Use a local PostgreSQL instance**
- Install PostgreSQL locally
- Create database and user:
  ```sql
  CREATE DATABASE elon_backend_db;
  CREATE USER elon_backend_db WITH PASSWORD 'tQX30fUtkLyi7X6IOGFJAjGAuPqgm0qu';
  GRANT ALL PRIVILEGES ON DATABASE elon_backend_db TO elon_backend_db;
  ```
- Update `.env`:
  ```
  DATABASE_URL=postgresql://elon_backend_db:tQX30fUtkLyi7X6IOGFJAjGAuPqgm0qu@localhost:5432/elon_backend_db
  ```

**Option C: Use Docker PostgreSQL**
```bash
docker run -d --name elon_postgres \
  -e POSTGRES_USER=elon_backend_db \
  -e POSTGRES_PASSWORD=tQX30fUtkLyi7X6IOGFJAjGAuPqgm0qu \
  -e POSTGRES_DB=elon_backend_db \
  -p 5432:5432 \
  postgres:15
```

Then update `.env`:
```
DATABASE_URL=postgresql://elon_backend_db:tQX30fUtkLyi7X6IOGFJAjGAuPqgm0qu@localhost:5432/elon_backend_db
```

### 2. Verify Admin Key Configuration

Check `.env` has admin key set:
```bash
grep ADMIN_KEY .env
# Output should show:
# ADMIN_KEY=elonu_admin_key_251104
# ADMIN_API_KEY=elonu_admin_key_251104
```

### 3. Start the Backend Server

```bash
npm run server:dev
# OR
npm run server

# Expected output:
# ✓ Server listening on port 5001
# All routes loaded successfully
```

### 4. Verify Backend is Running

In a new terminal, test the health endpoint:

```bash
# Using curl
curl http://localhost:5001/api/health

# Using PowerShell
Invoke-WebRequest http://localhost:5001/api/health
```

Expected response: `{"status":"ok"}`

### 5. Test Admin Endpoints

Test the admin users endpoint:

```bash
curl -H "x-admin-key: elonu_admin_key_251104" http://localhost:5001/api/admin/users
```

Expected response: `[]` or array of user objects

### 6. Start Frontend (if not running)

In another terminal:
```bash
npm start
# OR
npm run dev
```

Frontend will be at: `http://localhost:8080` (or `http://localhost:3000` for dev)

### 7. Access Admin Interface

Open in browser:
```
http://localhost:8080/admin.html
```

Or if serving from backend:
```
http://localhost:5001/admin.html
```

### 8. Test Admin Features

1. **Verify Admin Key**:
   - In the admin panel, paste `elonu_admin_key_251104` in the "Admin Key" input
   - Click "Load Users"
   - You should see a user list (may be empty if database is new)

2. **View Users**:
   - Click the "👥 View Users" button
   - Select a user to view their portfolio/transactions

3. **Manage Transactions**:
   - Scroll to "Transactions" section
   - Switch between tabs: All, Deposits, Withdrawals, Trades
   - Add new transaction using form
   - Edit/delete existing transactions

4. **Manage Testimonies**:
   - Scroll to "Testimonies" section
   - View pending testimonies
   - Approve or delete testimonies

5. **Set Balance**:
   - Under "Balance Management", enter amount and currency
   - Click "Apply" to update user balance

6. **Control Simulator**:
   - Under "⚙️ Simulator" section
   - Start/pause portfolio simulator for selected user

## API Endpoints

All endpoints require `x-admin-key` header with correct key.

### Users
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get single user
- `GET /api/admin/users/:id/portfolio` - Get user portfolio with live prices
- `GET /api/admin/users/:id/transactions` - List user transactions
- `POST /api/admin/users/:id/set-balance` - Update user balance
- `POST /api/admin/users/:id/set-portfolio` - Set user holdings

### Transactions
- `GET /api/admin/transactions` - List all transactions
- `POST /api/admin/transactions` - Create transaction
- `DELETE /api/admin/transactions/:id` - Delete transaction

### Testimonies
- `GET /api/admin/testimonies` - List all testimonies
- `POST /api/admin/testimonies/:id/approve` - Approve testimony
- `DELETE /api/admin/testimonies/:id` - Delete testimony

### Simulator
- `GET /api/admin/users/:id/simulator` - Get simulator status
- `POST /api/admin/users/:id/simulator/start` - Start simulator
- `POST /api/admin/users/:id/simulator/pause` - Pause simulator

### Other
- `POST /api/admin/credit` - Credit user account
- `GET /api/admin/verify-key` - Verify admin key is valid

## Troubleshooting

### Problem: Backend won't start
**Cause**: Database connection failure
**Solution**: Follow "Fix Database Connection" in Setup Steps above

### Problem: 404 on admin endpoints
**Cause**: Backend server not running
**Solution**: 
```bash
npm run server:dev
# Check for "✓ Server listening on port 5001"
```

### Problem: Admin features not loading after entering key
**Cause**: Network error or wrong key
**Solution**: 
1. Check browser console for errors (F12)
2. Verify key is exactly: `elonu_admin_key_251104`
3. Ensure backend is running on port 5001

### Problem: "Can't connect to database"
**Cause**: Database is not accessible
**Solution**: Fix DATABASE_URL (see Setup Step 1)

### Problem: Users list is empty
**Cause**: No users exist in database
**Solution**: 
1. Create a test user via signup page, or
2. Seed the database:
   ```bash
   node seed-users.js
   ```

## Frontend Files

- **admin.html** - Main admin interface (light theme, all sections)
- **css/pro-admin.css** - Styling for admin interface
- **js/admin.js** - Admin logic and API integration

## Backend Files

- **src/server.js** - Express server setup and route registration
- **src/routes/admin.js** - All admin API endpoints
- **src/db/** - Database connection and schema management

## Notes

- Admin key is stored in browser `sessionStorage` during session
- All admin API calls include `x-admin-key` header automatically
- Messages display inline with auto-dismiss (3 seconds)
- Admin controls are hidden until key is verified
- Light theme with blue accents (#2563eb)

## Support

If the admin system still doesn't work after following these steps, check:
1. Database is accessible and running
2. .env has ADMIN_KEY set to `elonu_admin_key_251104`
3. Backend shows "✓ Server listening on port 5001"
4. Frontend loads without console errors
5. Network requests show x-admin-key header in browser DevTools
