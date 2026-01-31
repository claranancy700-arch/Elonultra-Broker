# React SPA Migration Guide

## Architecture Overview

Your project has been set up as a **Single Page Application (SPA)** using React + Vite. This means:

### ✅ What Changed
- **Before**: Multiple HTML files (admin.html, dashboard.html, etc.) → full page reloads on nav clicks
- **After**: Single `index.html` + React Router → dynamic content swaps, no reloads

### 📁 Folder Structure (Clean Architecture)

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/           # Shared layouts (Header, Sidebar, etc.)
│   │   │   ├── Header.jsx
│   │   │   ├── Header.css
│   │   │   ├── MainLayout.jsx
│   │   │   └── MainLayout.css
│   │   │
│   │   ├── pages/           # Full page components
│   │   │   ├── Admin/
│   │   │   │   └── AdminPage.jsx
│   │   │   ├── Dashboard/
│   │   │   │   └── DashboardPage.jsx
│   │   │   ├── Markets/
│   │   │   │   └── MarketsPage.jsx
│   │   │   └── Auth/
│   │   │       └── LoginPage.jsx
│   │   │
│   │   └── common/          # Reusable UI components
│   │       ├── Card.jsx
│   │       ├── Modal.jsx
│   │       └── ... (shared across pages)
│   │
│   ├── context/             # Global state management
│   │   └── AuthContext.jsx  # User auth, login state
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js       # Access auth context
│   │   └── useApi.js        # Make API calls with error handling
│   │
│   ├── services/            # External service integration
│   │   └── api.js           # Axios setup + interceptors
│   │
│   ├── App.jsx              # Main router setup
│   ├── App.css              # Global styles
│   └── main.jsx             # Entry point
```

---

## Running the Project

### Development (Both Frontend + Backend)
```bash
npm run dev
```
This starts:
- **Frontend**: http://localhost:5173 (React Vite dev server)
- **Backend**: http://localhost:5001 (Express API)

### Frontend Only
```bash
npm run dev:frontend
cd frontend && npm run dev
```

### Backend Only
```bash
npm run dev:server
```

---

## How It Works (NO FULL PAGE RELOADS!)

### 1. **User clicks navigation link**
```jsx
// In Header.jsx
<Link to="/dashboard" className="nav-link">Dashboard</Link>
```

### 2. **React Router intercepts, doesn't reload page**
```jsx
// In App.jsx - Routes defined here
<Routes>
  <Route path="/dashboard" element={<DashboardPage />} />
</Routes>
```

### 3. **Component swaps in, SAME body**
```jsx
// MainLayout.jsx provides consistent header/footer
<MainLayout>
  <Outlet />  // <-- Component swaps here
</MainLayout>
```

---

## Key Patterns (To Avoid Spaghetti Code)

### ✅ Using Auth Context
```jsx
// Any component can access user data
import { useAuth } from '../hooks/useAuth';

export const MyComponent = () => {
  const { user, logout } = useAuth();
  
  if (!user) return <Redirect to="/login" />;
  
  return <div>Welcome, {user.email}!</div>;
};
```

### ✅ Making API Calls
```jsx
// hooks/useApi.js handles all API logic
import { useApi } from '../hooks/useApi';

export const DashboardPage = () => {
  const { request, loading, error } = useApi();
  
  const fetchDashboard = async () => {
    const data = await request('GET', '/dashboard');
    // data is ready
  };
  
  return <div>{loading ? 'Loading...' : 'Ready'}</div>;
};
```

### ✅ Protected Routes
```jsx
// In App.jsx - can wrap routes
<Route path="/admin" element={<ProtectedRoute> <AdminPage /> </ProtectedRoute>} />
```

### ✅ Page-Specific Styles
Each page folder has its own component + CSS:
```
Dashboard/
├── DashboardPage.jsx
└── DashboardPage.css
```

---

## Migration Steps (Incremental)

### Phase 1: ✅ DONE
- [x] Set up React + Vite
- [x] Install Router + Context + API layer
- [x] Create folder structure
- [x] Create stubs for each page

### Phase 2: NEXT
- [ ] Migrate Login page (use existing auth API)
- [ ] Migrate Dashboard (connect to balance API)
- [ ] Test auth flow

### Phase 3: Later
- [ ] Migrate Admin page
- [ ] Migrate Markets page
- [ ] Migrate Transactions page

---

## Key Files to Understand

| File | Purpose |
|------|---------|
| [frontend/src/App.jsx](../frontend/src/App.jsx) | Router setup + route definitions |
| [frontend/src/context/AuthContext.jsx](../frontend/src/context/AuthContext.jsx) | Global auth state |
| [frontend/src/services/api.js](../frontend/src/services/api.js) | Backend API client |
| [frontend/src/components/layout/MainLayout.jsx](../frontend/src/components/layout/MainLayout.jsx) | Layout wrapper for pages |
| [frontend/src/hooks/useAuth.js](../frontend/src/hooks/useAuth.js) | Hook to access auth |

---

## Backend Integration

**NO changes needed to backend!** ✅

The React app calls your existing Express API:
- Auth endpoints: `/api/auth/login`, `/api/auth/register`, etc.
- Dashboard: `/api/dashboard`
- Transactions: `/api/transactions`
- All existing endpoints work as-is

The API client in [frontend/src/services/api.js](../frontend/src/services/api.js) automatically:
- Attaches JWT tokens to requests
- Handles 401 errors (redirects to login)
- Provides error messages

---

## Next Steps

1. **Start the dev server**: `npm run dev`
2. **Review** [frontend/src/App.jsx](../frontend/src/App.jsx) to understand routing
3. **Test** navigation between stubs (no reloads!)
4. **Migrate Login page** - let's start there!

---

## Key Takeaway

Your old code:
```html
<!-- admin.html (separate file) -->
<a href="dashboard.html">Dashboard</a>

<!-- dashboard.html (separate file) -->
<a href="admin.html">Admin</a>
```

New code (single page app):
```jsx
// ONE App.jsx handles all routes
<BrowserRouter>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/admin" element={<AdminPage />} />
  </Routes>
</BrowserRouter>
```

**Same body, different content. No full reloads. Clean architecture.**

---

Questions? Ask and I'll help migrate any specific page! 🚀
