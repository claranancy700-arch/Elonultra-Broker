# Admin Prompt Delivery - Issues Found

## Summary
❌ **Admin prompts are NOT reaching users reliably** due to multiple issues

---

## Issue #1: PRO-admin.js Calls Wrong Endpoint (CRITICAL)
**File:** `frontend/public/js/pro-admin.js` line 806
**Problem:** Calls `/api/admin/send-prompt` which **DOES NOT EXIST**

```javascript
fetch(`${apiBase}/admin/send-prompt`, {  // ❌ WRONG ENDPOINT - THIS DOESN'T EXIST
  method: 'POST',
  headers: {'Content-Type':'application/json', 'x-admin-key':key},
  body: JSON.stringify({message: msg, userIds: userIds ? userIds.split(',').map(x => x.trim()) : null})
})
```

**Result:** When admin uses PRO-admin.html to send prompts, the request silently fails or returns 404.

**Fix:** Change to correct endpoint:
```javascript
fetch(`${apiBase}/admin/prompts`, {  // ✓ CORRECT ENDPOINT
```

---

## Issue #2: Admin.js Uses Correct Endpoint ✓
**File:** `frontend/public/js/admin.js` line 726
**Status:** Working correctly ✓

```javascript
const res = await fetch(baseApi + '/admin/prompts', {  // ✓ CORRECT
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
  body: JSON.stringify({ userIds, message })
});
```

---

## Issue #3: Backend Endpoint Flow

### ✓ Creating Prompts: `/api/admin/prompts` (POST)
**File:** `src/routes/admin.js` line 806-827
**Status:** Working ✓
- Creates prompts in `admin_prompts` table
- Supports targeted users OR broadcast (when userIds is empty)

### ✓ Users Fetching Prompts: `/api/prompts` (GET)
**File:** `src/routes/prompts.js` line 7-27
**Status:** Working ✓
- Returns active unresponded prompts for authenticated user
- Includes broadcast prompts (user_id IS NULL)
- Filters out already responded prompts

### ✓ Users Responding: `/api/prompts/:id/respond` (POST)
**File:** `src/routes/prompts.js` line 29-50
**Status:** Working ✓
- Records user response
- Auto-deactivates prompt after response

---

## Issue #4: Prompts Only Show on Dashboard Initialization
**File:** `frontend/public/js/dashboard.js` line 239-258
**Status:** Only active during dashboard load

```javascript
// Check for admin prompts targeted to this user and show an input prompt if any
try {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, AuthService.getAuthHeader());
  const resp = await fetch((AuthService.API_BASE || '/api') + '/prompts', { headers });
  if (resp.ok) {
    const j = await resp.json();
    if (j && Array.isArray(j.prompts) && j.prompts.length) {
      for (const p of j.prompts) {
        try {
          const answer = window.prompt(p.message, '');  // ✓ Shows browser prompt
          if (answer !== null) {
            await fetch((AuthService.API_BASE || '/api') + `/prompts/${p.id}/respond`, ...);
          }
        } catch (_e) { console.warn('Failed to respond to prompt', _e); }
      }
    }
  }
}
```

**Problem:** Prompts ONLY show when user navigates to dashboard - not on other pages

**Location:** Only called during DOMContentLoaded on dashboard.html

---

## Current Flow

```
Admin sends prompt via admin.js
    ↓
POST /api/admin/prompts  ✓
    ↓
Stored in admin_prompts table
    ↓
User navigates to dashboard
    ↓
Dashboard calls GET /api/prompts  ✓
    ↓
Browser shows native window.prompt()  ✓
    ↓
User responds
    ↓
POST /api/prompts/:id/respond  ✓
    ↓
Prompt marked inactive
```

---

## Broken Flow (PRO-admin)

```
Admin sends prompt via PRO-admin.js
    ↓
POST /api/admin/send-prompt  ❌ ENDPOINT DOESN'T EXIST
    ↓
Request fails silently or 404
    ↓
Prompt NEVER created - users get nothing
```

---

## Database Schema Check
**Table:** `admin_prompts`
```sql
CREATE TABLE admin_prompts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = broadcast
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_prompt_responses (
  id SERIAL PRIMARY KEY,
  prompt_id INTEGER NOT NULL REFERENCES admin_prompts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Logging Evidence

### ✓ When prompts are CREATED (working):
```
[Admin] GET /users - Admin key check
Creating prompt: { userIds: [123], messageLength: 45 }
Created prompts for users: [123]
```

### ✓ When users FETCH prompts (working):
```
[PROMPT LIST] Fetching active unresponded prompts for user: 123
[PROMPT LIST] Found 1 active unresponded prompts for user 123
[PROMPT LIST] Prompt IDs: [456]
```

### ✓ When users RESPOND (working):
```
[PROMPT RESPOND] User 123 responding to prompt 456 with: "user's answer"
[PROMPT RESPOND] ✓ Response saved and prompt deactivated for user 123 prompt 456
```

---

## Fixes Needed

### Fix #1: Change PRO-admin.js endpoint
**File:** `frontend/public/js/pro-admin.js` line 806

**Change:**
```javascript
// FROM:
fetch(`${apiBase}/admin/send-prompt`, {
// TO:
fetch(`${apiBase}/admin/prompts`, {
```

### Fix #2 (Optional): Show prompts on all pages
**Issue:** Prompts only show when users login/visit dashboard
**Solution:** Add prompt fetching to a shared component or periodically check

---

## Test Checklist

- [ ] Send prompt from admin.js to specific user
- [ ] Verify in db: `SELECT * FROM admin_prompts WHERE user_id = ?`
- [ ] User logs in and visits dashboard
- [ ] Browser prompt appears with message
- [ ] User submits response
- [ ] Verify in db: `SELECT * FROM admin_prompt_responses` - response saved
- [ ] Try sending broadcast prompt (leave user ID empty)
- [ ] All users should see broadcast when they visit dashboard
- [ ] Test PRO-admin.js after endpoint fix

---

## Related Files

- Admin creation: [src/routes/admin.js](src/routes/admin.js#L806-L827)
- Prompt routes: [src/routes/prompts.js](src/routes/prompts.js)
- Admin UI: [frontend/public/admin.html](frontend/public/admin.html#L226-L250)
- Admin JS: [frontend/public/js/admin.js](frontend/public/js/admin.js#L706-L728)
- PRO Admin JS: [frontend/public/js/pro-admin.js](frontend/public/js/pro-admin.js#L806) ← **NEEDS FIX**
- Dashboard: [frontend/public/js/dashboard.js](frontend/public/js/dashboard.js#L239-L258)
