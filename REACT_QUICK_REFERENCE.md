# React SPA - Quick Reference Card

## 🚀 Start Here
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:5001
```

---

## 📁 Folder Map

```
frontend/src/
├── App.jsx                 ← Routes defined here
├── App.css                 ← Global styles
├── main.jsx               ← Entry point
│
├── components/
│   ├── layout/
│   │   ├── Header.jsx      ← Navigation
│   │   └── MainLayout.jsx  ← Page wrapper
│   ├── pages/
│   │   ├── Dashboard/DashboardPage.jsx
│   │   ├── Admin/AdminPage.jsx
│   │   ├── Markets/MarketsPage.jsx
│   │   └── Auth/LoginPage.jsx
│   └── common/
│       └── Card.jsx        ← Reusable components
│
├── context/
│   └── AuthContext.jsx     ← User state (global)
│
├── hooks/
│   ├── useAuth.js         ← Get user from context
│   ├── useApi.js          ← API calls with error handling
│   └── ... (custom logic)
│
└── services/
    └── api.js             ← Axios + JWT + interceptors
```

---

## 🔄 How It Works

```
User clicks link
    ↓
React Router intercepts
    ↓
Component swaps (same body!)
    ↓
NO page reload ⚡
```

---

## 💻 Code Snippets

### Route (in App.jsx)
```jsx
<Route path="/dashboard" element={<DashboardPage />} />
```

### Navigate (in component)
```jsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/dashboard');
```

### Use Auth
```jsx
import { useAuth } from '../hooks/useAuth';

const { user, login, logout } = useAuth();
```

### API Call
```jsx
import { useApi } from '../hooks/useApi';

const { request, loading, error } = useApi();
const data = await request('POST', '/endpoint', { body });
```

### Component
```jsx
import React from 'react';
import './MyComponent.css';

export const MyComponent = ({ title, children }) => (
  <div className="my-component">
    <h3>{title}</h3>
    {children}
  </div>
);
```

### Hook
```jsx
import { useState, useEffect } from 'react';
import { useApi } from './useApi';

export const useMyLogic = () => {
  const { request } = useApi();
  const [data, setData] = useState(null);

  useEffect(() => {
    request('GET', '/endpoint').then(setData);
  }, [request]);

  return data;
};
```

---

## ✅ Checklist for New Page

- [ ] Create folder: `components/pages/FeatureName/`
- [ ] Create component: `FeatureNamePage.jsx`
- [ ] Create styles: `FeatureNamePage.css`
- [ ] Add route in `App.jsx`
- [ ] Add nav link in `Header.jsx`
- [ ] Test (no reload when clicking!)

---

## 🎯 Common Tasks

| Task | Code |
|------|------|
| **Get user** | `const { user } = useAuth();` |
| **Logout** | `logout(); navigate('/login');` |
| **Fetch data** | `const data = await request('GET', '/api/endpoint');` |
| **Show loading** | `{loading ? <Loading /> : <Content />}` |
| **Show error** | `{error && <Error msg={error} />}` |
| **Navigate** | `navigate('/page');` |
| **Link** | `<Link to="/page">Link</Link>` |
| **Protected page** | `if (!user) return <Navigate to="/login" />;` |

---

## 🔌 Backend Integration

Your backend API works as-is!

```javascript
// No changes needed to existing endpoints
// useApi() handles:
// - Adding JWT token to requests
// - Catching errors
// - Showing loading states

const { request } = useApi();
const user = await request('POST', '/auth/login', { email, password });
const balance = await request('GET', '/dashboard/balance');
```

---

## 🐛 Debug

**Browser console (F12)**:
```javascript
// Check if logged in
localStorage.getItem('token')

// Check user data
localStorage.getItem('user')

// Check routes working
// Open Network tab, click nav links
// Should see NO full page reloads
```

**Check build**:
```bash
cd frontend && npm run build
# Should show: ✓ built in Xms
```

---

## 📊 Before & After

| | Before | After |
|---|--------|-------|
| Files | admin.html, dashboard.html, ... | ONE index.html |
| Nav | Full page reload | Instant swap |
| Code | Mixed HTML/CSS/JS | Components + hooks + services |
| State | Global variables | React Context |
| Errors | Scattered try-catch | Centralized in hooks |
| Reuse | Copy-paste | Import hook/component |

---

## 🚨 Common Mistakes

❌ **API calls in component**
```jsx
// DON'T do this
useEffect(() => {
  fetch('/api/data').then(...);
}, []);
```

✅ **API calls in hook**
```jsx
// DO this
const { data } = useMyData();
```

❌ **Prop drilling**
```jsx
// DON'T do this
<Page user={user} setUser={setUser} balance={balance} ... />
```

✅ **Use Context**
```jsx
// DO this
const { user, balance } = useAuth();
```

❌ **Mixed concerns**
```jsx
// DON'T do this
const MyComponent = () => {
  const [data, setData] = useState();
  const [loading, setLoading] = useState();
  // ... 100 lines of logic here
  return <div>UI</div>;
};
```

✅ **Separate concerns**
```jsx
// DO this
const useMyData = () => { /* logic */ };
const MyComponent = () => {
  const { data, loading } = useMyData();
  return <div>UI</div>;
};
```

---

## 📚 Files to Read

1. **REACT_SETUP_COMPLETE.md** ← You are here!
2. **REACT_MIGRATION_GUIDE.md** ← How to use it
3. **REACT_ARCHITECTURE.md** ← Deep dive
4. **REACT_MIGRATION_EXAMPLES.md** ← Code examples

---

## 🎉 You Got This!

```bash
npm run dev
# → http://localhost:5173
# → Click links
# → Watch the magic (no reloads!)
```

Questions? Check the docs above or ask! 🚀
