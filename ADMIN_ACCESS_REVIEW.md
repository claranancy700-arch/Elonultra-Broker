# Admin Access Issue Review

## Problem Summary
Regular users receive **no admin prompts or messages at all**. The admin interface is blocked but silently.

## Current State

### 1. Legacy Admin Page (`/admin.html`)
- **Location:** Served at `/admin.html` (HTTP 200)
- **Access Control:** Requires manually pasting `x-admin-key` header via input form
- **Status:** ✅ Functional and accessible but not linked in React app

### 2. React Admin Page (`/admin` route)
- **Location:** `/admin` route in React app
- **Access Control:** Checks `user.isAdmin` flag
- **Issue:** ❌ `isAdmin` field is **NEVER SET** anywhere
  - Not in database schema (no `is_admin` column in users table)
  - Not returned by `/auth/me` endpoint
  - Result: **ALL users are silently redirected to dashboard**

## Technical Details

### Users Table Schema
Columns checked: 18 total
✅ Has: `id, name, email, password_hash, balance, portfolio_value, created_at, updated_at, fullname, phone, tax_id, is_active, deleted_at, sim_enabled, sim_paused, sim_next_run_at, sim_last_run_at, sim_started_at`
❌ Missing: `is_admin`, `isAdmin`, `admin_role`, any admin flag

### `/auth/me` Endpoint
**Returns:** `id, name, email, phone, fullName, balance, portfolio_value, sim_enabled, sim_paused, created_at`
**Missing:** No `isAdmin` or role field

### Frontend AdminPage Protection
```jsx
useEffect(() => {
  if (user && !user.isAdmin) {
    navigate('/dashboard');  // ← Silently redirects ALL users
  }
}, [user, navigate]);
```

## Impact
- Admins cannot access admin interface via React app
- Users naively navigate to `/admin` → silently redirected → get confused
- No error message or explanation shown

## Recommendations

**Option A: Add Admin Role Support (Recommended)**
1. Add `is_admin BOOLEAN DEFAULT FALSE` column to users table
2. Update `/auth/me` to return `is_admin` flag  
3. Update AdminPage to show error message instead of silent redirect
4. Provide backend endpoint to toggle admin status

**Option B: Use Legacy Admin Interface Only**
1. Remove React `/admin` route entirely
2. Link to `/admin.html` in legacy menu (if needed)
3. Document that admin access requires API key (more secure)

**Option C: Hybrid Approach (Current Broken State)**
1. Keep both interfaces
2. Fix the isAdmin flag issue
3. Ensure they work together seamlessly

## Files to Check/Update if Option A Chosen
- `sql/001_init_schema.sql` - Add migration to add is_admin column
- `src/routes/auth.js` - Update /me to return is_admin
- `frontend/src/components/pages/Admin/AdminPage.jsx` - Show error message
- `src/routes/admin.js` - Add endpoint to toggle admin status
- Database - Add is_admin column with migration
