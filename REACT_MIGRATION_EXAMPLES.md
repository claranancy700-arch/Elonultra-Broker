# Migration Examples: From HTML to React

This document shows how to migrate your existing HTML pages to React components with clean code.

---

## Example 1: Login Page

### ❌ Old (admin.html / login.html)
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="css/styles.css">
  <script src="js/auth.js"></script>
</head>
<body>
  <form id="loginForm">
    <input type="email" id="email" placeholder="Email" required />
    <input type="password" id="password" placeholder="Password" required />
    <button type="submit">Login</button>
    <div id="error"></div>
  </form>

  <script>
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
          localStorage.setItem('token', data.token);
          window.location.href = '/dashboard.html';  // FULL PAGE RELOAD!
        } else {
          document.getElementById('error').textContent = data.message;
        }
      } catch (err) {
        document.getElementById('error').textContent = 'Error: ' + err.message;
      }
    });
  </script>
</body>
</html>
```

**Problems**:
- Mixed HTML, CSS, JS in one file
- Manual DOM manipulation
- No state management
- Full page reload on login
- Error handling scattered

### ✅ New (React LoginPage)

**File**: `frontend/src/components/pages/Auth/LoginPage.jsx`

```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './LoginPage.css';

export const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { request, loading, error } = useApi();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const data = await request('POST', '/auth/login', {
        email,
        password,
      });

      // Login updates AuthContext + localStorage
      login(data.user, data.token);
      
      // Navigate to dashboard (NO PAGE RELOAD!)
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Login</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {(formError || error) && (
            <div className="error-message">
              {formError || error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
```

**File**: `frontend/src/components/pages/Auth/LoginPage.css`

```css
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%);
}

.login-card {
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(100, 200, 255, 0.2);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 150, 255, 0.15);
}

.login-card h1 {
  background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1.5rem;
  text-align: center;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(100, 200, 255, 0.3);
  border-radius: 6px;
  background: rgba(100, 200, 255, 0.05);
  color: #e0e7ff;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #00d4ff;
  background: rgba(100, 200, 255, 0.1);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff6b6b;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

button[type="submit"] {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0.5rem;
}

button[type="submit"]:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
}

button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.5rem;
  }
}
```

**Benefits**:
- ✅ Clear component structure
- ✅ Hooks handle state + logic
- ✅ No full page reload
- ✅ Automatic error handling (via useApi)
- ✅ Loading state shown to user
- ✅ AuthContext manages global auth state

---

## Example 2: Dashboard Page

### ❌ Old (dashboard.html)
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="css/styles.css">
  <script src="js/api.js"></script>
  <script src="js/dashboard.js"></script>
</head>
<body>
  <header><!-- navigation --></header>
  
  <div class="page-container">
    <h1>Dashboard</h1>
    
    <div id="balance-card" class="card">
      <h2>Balance</h2>
      <div id="balance-value">Loading...</div>
    </div>

    <div id="portfolio-card" class="card">
      <h2>Portfolio</h2>
      <div id="portfolio-list">Loading...</div>
    </div>
  </div>

  <script>
    // DOM manipulation scattered everywhere
    async function loadDashboard() {
      try {
        const [balance, portfolio] = await Promise.all([
          fetch('/api/dashboard/balance').then(r => r.json()),
          fetch('/api/dashboard/portfolio').then(r => r.json())
        ]);

        document.getElementById('balance-value').textContent = 
          '$' + balance.total.toFixed(2);

        const list = document.getElementById('portfolio-list');
        list.innerHTML = portfolio.map(p => `
          <div class="item">
            <span>${p.symbol}</span>
            <span>${p.quantity}</span>
            <span>${p.value}</span>
          </div>
        `).join('');
      } catch (err) {
        document.getElementById('balance-card').innerHTML = 
          'Error: ' + err.message;
      }
    }

    window.addEventListener('load', loadDashboard);
  </script>
</body>
</html>
```

**Problems**:
- DOM queries scattered everywhere
- Manual HTML string concatenation (XSS vulnerability!)
- No proper error boundaries
- Hard to test
- Hard to reuse components

### ✅ New (React Dashboard)

**File**: `frontend/src/components/pages/Dashboard/DashboardPage.jsx`

```jsx
import React, { useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { Card } from '../../common/Card';
import { PortfolioTable } from './PortfolioTable';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { request, loading: apiLoading, error: apiError } = useApi();
  const [balance, setBalance] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [balanceData, portfolioData] = await Promise.all([
          request('GET', '/dashboard/balance'),
          request('GET', '/dashboard/portfolio'),
        ]);

        setBalance(balanceData);
        setPortfolio(portfolioData);
      } catch (err) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [request]);

  if (loading) {
    return <div className="dashboard-container"><p>Loading dashboard...</p></div>;
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      <div className="dashboard-grid">
        <Card title="Available Balance">
          <div className="balance-value">
            ${balance?.total?.toFixed(2) || '0.00'}
          </div>
          <div className="balance-detail">
            Gain/Loss: <span className={balance?.gainLoss >= 0 ? 'positive' : 'negative'}>
              {balance?.gainLoss >= 0 ? '+' : ''}{balance?.gainLoss?.toFixed(2)}%
            </span>
          </div>
        </Card>

        <Card title="Portfolio Holdings">
          <PortfolioTable items={portfolio} />
        </Card>
      </div>
    </div>
  );
};
```

**File**: `frontend/src/components/pages/Dashboard/PortfolioTable.jsx`

```jsx
import React from 'react';

export const PortfolioTable = ({ items }) => {
  if (!items || items.length === 0) {
    return <p>No holdings yet</p>;
  }

  return (
    <table className="portfolio-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Quantity</th>
          <th>Value</th>
          <th>Gain/Loss</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td><strong>{item.symbol}</strong></td>
            <td>{item.quantity}</td>
            <td>${item.value.toFixed(2)}</td>
            <td className={item.gainLoss >= 0 ? 'positive' : 'negative'}>
              {item.gainLoss >= 0 ? '+' : ''}{item.gainLoss.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

**File**: `frontend/src/components/pages/Dashboard/DashboardPage.css`

```css
.dashboard-container {
  padding: 1rem;
}

.dashboard-container h1 {
  margin-bottom: 1.5rem;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.balance-value {
  font-size: 2rem;
  font-weight: 700;
  color: #00d4ff;
  margin-bottom: 0.5rem;
}

.balance-detail {
  font-size: 0.9rem;
  color: #cbd5e1;
}

.balance-detail .positive {
  color: #4ade80;
}

.balance-detail .negative {
  color: #ff6b6b;
}

.portfolio-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.portfolio-table thead {
  border-bottom: 2px solid rgba(100, 200, 255, 0.3);
}

.portfolio-table th {
  padding: 0.75rem;
  text-align: left;
  color: #cbd5e1;
  font-weight: 600;
}

.portfolio-table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(100, 200, 255, 0.1);
  color: #e0e7ff;
}

.portfolio-table tr:hover {
  background: rgba(100, 200, 255, 0.05);
}

.portfolio-table .positive {
  color: #4ade80;
  font-weight: 600;
}

.portfolio-table .negative {
  color: #ff6b6b;
  font-weight: 600;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .portfolio-table {
    font-size: 0.85rem;
  }

  .portfolio-table th,
  .portfolio-table td {
    padding: 0.5rem;
  }
}
```

**Benefits**:
- ✅ Separate component per feature (PortfolioTable)
- ✅ No manual DOM manipulation
- ✅ Error handling built-in
- ✅ Loading states shown
- ✅ Components are testable and reusable
- ✅ Styles scoped to component

---

## Example 3: Custom Hook (Business Logic)

### ❌ Old (scattered in dashboard.js)
```javascript
// This logic is mixed throughout the file
async function fetchAndUpdateBalance() {
  // fetch code here
}

setInterval(fetchAndUpdateBalance, 5000); // polling scattered
```

### ✅ New (Reusable Hook)

**File**: `frontend/src/hooks/useDashboard.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';

/**
 * Custom hook for dashboard data
 * Handles fetching balance and portfolio
 * Auto-refreshes every 5 seconds
 */
export const useDashboard = () => {
  const { request, loading, error } = useApi();
  const [balance, setBalance] = useState(null);
  const [portfolio, setPortfolio] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [balanceData, portfolioData] = await Promise.all([
        request('GET', '/dashboard/balance'),
        request('GET', '/dashboard/portfolio'),
      ]);
      setBalance(balanceData);
      setPortfolio(portfolioData);
    } catch (err) {
      // Error already logged by useApi
      console.error('Dashboard fetch failed:', err);
    }
  }, [request]);

  // Fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    balance,
    portfolio,
    loading,
    error,
    refresh: fetchData, // Allow manual refresh
  };
};
```

**Usage** (in any component):
```jsx
export const MyComponent = () => {
  const { balance, portfolio, loading, refresh } = useDashboard();

  return (
    <div>
      <button onClick={refresh}>Refresh Now</button>
      {balance && <div>${balance.total}</div>}
    </div>
  );
};
```

**Benefits**:
- ✅ Reusable across components
- ✅ Logic separated from UI
- ✅ Easy to test
- ✅ Easy to modify (e.g., change refresh interval)

---

## Example 4: Common Component (Reusable UI)

### ❌ Old (repeated in every HTML file)
```html
<!-- Every page has to repeat this -->
<div class="card">
  <h3>Title</h3>
  <div class="card-content">Content here</div>
</div>

<style>
  .card {
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 8px;
  }
  /* Repeat in every CSS file */
</style>
```

### ✅ New (Single Reusable Component)

**File**: `frontend/src/components/common/Card.jsx`

```jsx
import React from 'react';
import './Card.css';

/**
 * Reusable Card component
 * @param {string} title - Card title
 * @param {ReactNode} children - Card content
 * @param {string} className - Additional CSS classes
 * @param {function} onClick - Click handler
 */
export const Card = ({ title, children, className = '', onClick }) => {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">{children}</div>
    </div>
  );
};
```

**File**: `frontend/src/components/common/Card.css`

```css
.card {
  background: rgba(20, 20, 40, 0.9);
  border: 1px solid rgba(100, 200, 255, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s;
  cursor: pointer;
}

.card:hover {
  border-color: rgba(100, 200, 255, 0.4);
  box-shadow: 0 8px 24px rgba(0, 150, 255, 0.1);
  transform: translateY(-2px);
}

.card-title {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: #cbd5e1;
  font-weight: 600;
}

.card-content {
  color: #e0e7ff;
}
```

**Usage** (everywhere):
```jsx
<Card title="My Data">
  <p>Content goes here</p>
</Card>

<Card 
  title="Clickable Card"
  onClick={() => navigate('/page')}
  className="clickable"
>
  Click me!
</Card>
```

**Benefits**:
- ✅ Write once, use everywhere
- ✅ Consistent styling
- ✅ Easy to update (change Card.css, all instances update)
- ✅ Props for flexibility

---

## Summary: Old vs New

| Aspect | Old (HTML) | New (React) |
|--------|-----------|-----------|
| **Navigation** | Full page reload | Instant, no reload |
| **Code location** | Mixed (HTML/CSS/JS) | Separated (Component/CSS/Logic) |
| **Reusability** | Copy-paste | Import hook/component |
| **State management** | Global variables | React state + Context |
| **Error handling** | Try-catch scattered | Centralized in hooks |
| **Testing** | Hard | Easy |
| **Maintenance** | Hard (changes everywhere) | Easy (change once) |

---

## Next: Migrate Your Pages

Ready to migrate more pages? Here's the process:

1. **Create page folder**: `frontend/src/components/pages/YourFeature/`
2. **Extract logic to hook**: `frontend/src/hooks/useYourFeature.js`
3. **Build component**: `YourFeaturePage.jsx`
4. **Style it**: `YourFeaturePage.css`
5. **Add route**: Update `App.jsx`
6. **Test**: Navigate without page reload ✅

Need help? Let me know which page to migrate next!
