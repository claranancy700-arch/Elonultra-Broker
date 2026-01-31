# React SPA Architecture & Clean Code Principles

## Overview

Your project has been successfully migrated to a **Single Page Application (SPA)** using React + Vite. This document explains the architecture and how to maintain clean, non-spaghetti code.

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────┐
│   React Components (UI)                  │
│   ├── Pages (Dashboard, Admin, etc.)     │
│   ├── Layouts (Header, Sidebar)          │
│   └── Common (Card, Modal, Input)        │
├─────────────────────────────────────────┤
│   State Management (React Context)       │
│   └── AuthContext (User, Token, Auth)    │
├─────────────────────────────────────────┤
│   Custom Hooks (Business Logic)          │
│   ├── useAuth (Access auth state)        │
│   └── useApi (Make API calls)            │
├─────────────────────────────────────────┤
│   Services (External Integration)        │
│   └── api.js (Axios + JWT + Errors)      │
├─────────────────────────────────────────┤
│   Express Backend (Unchanged)            │
│   ├── /api/auth                          │
│   ├── /api/dashboard                     │
│   ├── /api/transactions                  │
│   └── ... (all existing endpoints)       │
└─────────────────────────────────────────┘
```

---

## 🚀 Key Design Principles

### 1. **Separation of Concerns**
- **Components** = Visual rendering only
- **Hooks** = Business logic (data fetching, state)
- **Context** = Global state (auth, user data)
- **Services** = API integration (backend calls)

### 2. **No Spaghetti Code**
❌ **Bad**: Logic mixed in components
```jsx
export const Dashboard = () => {
  const [balance, setBalance] = useState(0);
  
  useEffect(() => {
    fetch('/api/dashboard')  // API call in component
      .then(r => r.json())
      .then(d => setBalance(d.balance))
      .catch(err => console.log('ERROR:', err));  // Error handling here
  }, []);
  
  return <div>{balance}</div>;
};
```

✅ **Good**: Logic in hooks, component just renders
```jsx
export const Dashboard = () => {
  const { balance, loading, error } = useDashboard();
  
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return <div>{balance}</div>;
};

// Hook handles all logic
function useDashboard() {
  const { request, loading, error } = useApi();
  const [balance, setBalance] = useState(0);
  
  useEffect(() => {
    request('GET', '/dashboard')
      .then(d => setBalance(d.balance))
      .catch(() => {});
  }, [request]);
  
  return { balance, loading, error };
}
```

### 3. **Single Responsibility**
Each file does ONE thing:
- `Header.jsx` = Header layout only
- `useAuth.js` = Auth logic only
- `api.js` = API calls only
- `AuthContext.jsx` = Auth state only

### 4. **DRY (Don't Repeat Yourself)**
- Reuse hooks: `useAuth()`, `useApi()`
- Reuse components: `<Card />`, `<Modal />`
- Shared styles in CSS files

---

## 📁 File Organization

### Components Folder
```
components/
├── layout/              # Persistent UI (Header, Sidebar)
│   ├── Header.jsx       # Navigation header
│   ├── Header.css
│   ├── MainLayout.jsx   # Wrapper for all pages
│   └── MainLayout.css
│
├── pages/               # Full-page components (one per route)
│   ├── Admin/
│   │   └── AdminPage.jsx
│   ├── Dashboard/
│   │   └── DashboardPage.jsx
│   ├── Markets/
│   │   └── MarketsPage.jsx
│   ├── Auth/
│   │   └── LoginPage.jsx
│   └── NotFoundPage.jsx
│
└── common/              # Reusable UI blocks
    ├── Card.jsx         # Reusable card component
    ├── Modal.jsx        # Reusable modal
    ├── Button.jsx
    ├── Input.jsx
    └── ... (shared components)
```

### Context Folder
```
context/
├── AuthContext.jsx      # User, token, login/logout
└── AppContext.jsx       # (Future: notifications, theme, etc.)
```

### Hooks Folder
```
hooks/
├── useAuth.js           # Access auth context
├── useApi.js            # Make API calls with error handling
└── ... (custom logic)
```

### Services Folder
```
services/
├── api.js               # Axios instance + JWT + error handling
└── ... (other services)
```

---

## 🔄 Data Flow

### Login Example (No Full Page Reload!)

```
┌─────────────┐
│ User clicks │
│ Login button│
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ LoginPage calls      │
│ handleSubmit()       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Calls useAuth().login()      │
│ (from AuthContext)           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ api.js makes POST request    │
│ to /api/auth/login           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Backend responds with token  │
│ + user data                  │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ AuthContext updates state    │
│ (saves to localStorage)      │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ React re-renders Header      │
│ (now shows user info)        │
│ Navigate to /dashboard       │
│ (NO FULL PAGE RELOAD!)       │
└──────────────────────────────┘
```

---

## 🧩 Component Template

### New Page Component
```jsx
// pages/MyPage/MyPage.jsx
import React, { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import './MyPage.css';

export const MyPage = () => {
  const { user } = useAuth();
  const { request, loading, error } = useApi();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await request('GET', '/my-endpoint');
        setData(result);
      } catch (err) {
        // Error already handled by useApi
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, request]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="my-page">
      <h1>My Page</h1>
      {data && <div>{data}</div>}
    </div>
  );
};
```

### New Hook (Custom Logic)
```jsx
// hooks/useMyLogic.js
import { useState, useEffect } from 'react';
import { useApi } from './useApi';

export const useMyLogic = () => {
  const { request, loading, error } = useApi();
  const [value, setValue] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const result = await request('GET', '/endpoint');
      setValue(result);
    };
    fetch();
  }, [request]);

  return { value, loading, error };
};
```

### New Common Component
```jsx
// components/common/Card.jsx
import React from 'react';
import './Card.css';

export const Card = ({ title, children, onClick }) => {
  return (
    <div className="card" onClick={onClick}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">{children}</div>
    </div>
  );
};
```

---

## 🌐 Routing

All routes defined in ONE place: [frontend/src/App.jsx](../frontend/src/App.jsx)

```jsx
<BrowserRouter>
  <Routes>
    {/* Auth routes (no layout) */}
    <Route path="/login" element={<LoginPage />} />

    {/* Main routes (with layout) */}
    <Route element={<MainLayout />}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/markets" element={<MarketsPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

**Key**: Navigation happens in React Router, NOT in backend. No page reloads!

---

## 🔐 Authentication Flow

1. **Check on startup** (AuthContext)
   ```jsx
   useEffect(() => {
     const token = localStorage.getItem('token');
     if (token) setLoggedIn(true);
   }, []);
   ```

2. **Protect routes** (check in component)
   ```jsx
   if (!user) return <Navigate to="/login" />;
   ```

3. **Auto-attach JWT** (api.js interceptor)
   ```javascript
   API.interceptors.request.use((config) => {
     const token = localStorage.getItem('token');
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
   });
   ```

4. **Handle 401** (api.js interceptor)
   ```javascript
   API.interceptors.response.use(
     (response) => response,
     (error) => {
       if (error.response?.status === 401) {
         localStorage.removeItem('token');
         window.location.href = '/login';
       }
       return Promise.reject(error);
     }
   );
   ```

---

## 🚀 Development Workflow

### Add a New Page
1. Create folder: `frontend/src/components/pages/MyFeature/`
2. Create component: `MyFeaturePage.jsx`
3. Create styles: `MyFeaturePage.css`
4. Add route in [App.jsx](../frontend/src/App.jsx):
   ```jsx
   <Route path="/myfeature" element={<MyFeaturePage />} />
   ```
5. Add nav link in [Header.jsx](../frontend/src/components/layout/Header.jsx):
   ```jsx
   <Link to="/myfeature">My Feature</Link>
   ```

### Add a Custom Hook
1. Create: `frontend/src/hooks/useMyLogic.js`
2. Use in components:
   ```jsx
   const { data, loading } = useMyLogic();
   ```

### Add a Common Component
1. Create: `frontend/src/components/common/MyComponent.jsx`
2. Import anywhere:
   ```jsx
   import { MyComponent } from '../../common/MyComponent';
   ```

### Make an API Call
```jsx
const { request, loading, error } = useApi();

// In useEffect or event handler:
const data = await request('POST', '/endpoint', { payload });
```

---

## ✅ Code Quality Checklist

Before committing code, ensure:

- [ ] Component has clear purpose (not doing 10 things)
- [ ] API logic is in hooks, not components
- [ ] No inline styles (use CSS files)
- [ ] No console.log() left in code
- [ ] Error handling on all API calls
- [ ] Loading states shown to user
- [ ] No prop drilling (use context for global state)
- [ ] Components are < 200 lines
- [ ] Hooks are reusable
- [ ] CSS is scoped to component folder
- [ ] Build passes: `npm run build`

---

## 🐛 Debugging

### Check if running
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5001
```

### Build test
```bash
cd frontend && npm run build
# Should show "✓ built in Xms"
```

### Check Routes
1. Open DevTools (F12)
2. Go to Network tab
3. Click navigation links
4. Should see **NO** full page reloads (XHR/Fetch requests only)

### Check Auth
```javascript
// In browser console:
localStorage.getItem('token')  // Should have JWT
localStorage.getItem('user')   // Should have user JSON
```

---

## 📊 Performance Tips

1. **Code splitting**: Routes lazy load automatically with React
2. **Image optimization**: Use WebP with fallbacks
3. **CSS**: Minified automatically in production build
4. **Caching**: Service workers can be added later
5. **Monitoring**: Add error tracking (Sentry, etc.)

---

## 🎯 Next Steps

1. ✅ Setup complete - you're here!
2. **Migrate Login page** - connect to existing auth API
3. **Migrate Dashboard** - connect to balance/portfolio API
4. **Migrate Admin panel** - reuse existing admin JS
5. **Migrate Markets** - connect to price updates
6. **Test** - ensure no full page reloads
7. **Deploy** - build React app, serve from backend

---

## 📚 Resources

- [React Docs](https://react.dev)
- [React Router](https://reactrouter.com)
- [Vite Docs](https://vite.dev)
- [Context API](https://react.dev/reference/react/useContext)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

## 🎉 Benefits

Your new architecture provides:

✅ **No full page reloads** - instant navigation  
✅ **Clean separation** - easy to maintain  
✅ **Reusable code** - hooks & components  
✅ **Global state** - Context API  
✅ **Error handling** - centralized in api.js  
✅ **Type safety** - ready for TypeScript migration  
✅ **Testing** - components easier to test  
✅ **Scalability** - add features without spaghetti  

**You've got this! 🚀**
