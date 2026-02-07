/**
 * Auth Module — Manage JWT token, user profile, and authentication state
 * Usage: AuthService.login(email, password), AuthService.getUser(), etc.
 */

const AuthService = {
  TOKEN_KEY: 'authToken',
  USER_KEY: 'currentUser',
  // Use full backend URL in development (local dev server on port 5001)
  API_BASE: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? `http://${window.location.hostname}:5001/api`
    : '/api',

  // Store token in localStorage
  setToken(token) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    else localStorage.removeItem(this.TOKEN_KEY);
  },

  // Retrieve token from localStorage
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Store user data in memory (or localStorage)
  setUser(user) {
    if (user) {
      try {
        const u = Object.assign({}, user);
        // Normalize naming fields so frontend can read `name` or `fullName`
        if (u.fullName && !u.name) u.name = u.fullName;
        if (u.name && !u.fullName) u.fullName = u.name;
        localStorage.setItem(this.USER_KEY, JSON.stringify(u));
      } catch (e) {
        console.warn('Failed to set user in localStorage', e);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    } else localStorage.removeItem(this.USER_KEY);
  },

  // Retrieve stored user data
  getUser() {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Fetch user profile from backend using JWT token
  async fetchUserProfile() {
    const token = this.getToken();
    if (!token) throw new Error('No token found. Please log in.');

    const response = await fetch(`${this.API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to fetch user profile');
    }

    const data = await response.json();
    console.log('fetchUserProfile response:', data);
    // Support both { user: {...} } and { data: { user: {...} } } shapes
    const userPayload = (data && (data.user || (data.data && data.data.user))) || data;
    this.setUser(userPayload.user || userPayload);
    // Sync balance and portfolio if provided by server
    try {
    // Sync balance and portfolio if provided by server
    try {
      const serverUser = data && (data.user || (data.data && data.data.user)) || data.user || null;
      if (serverUser && typeof window !== 'undefined' && window.CBPortfolio) {
        if (typeof serverUser.balance !== 'undefined') {
          console.log('Setting balance from server:', serverUser.balance);
          window.CBPortfolio.setBalance(Number(serverUser.balance) || 0);
        }
        if (typeof serverUser.portfolio_value !== 'undefined' && window.CBPortfolio.setTotalValue) {
          window.CBPortfolio.setTotalValue(Number(serverUser.portfolio_value) || 0);
        }
        if (data.portfolio) {
          // Convert portfolio object to assets array expected by CBPortfolio
          const assets = [];
          const map = { btc_balance: 'BTC', eth_balance: 'ETH', usdt_balance: 'USDT', usdc_balance: 'USDC', xrp_balance: 'XRP', ada_balance: 'ADA' };
          for (const key of Object.keys(map)) {
            if (data.portfolio[key]) {
              assets.push({ symbol: map[key], name: map[key], amount: Number(data.portfolio[key]) || 0, value: 0 });
            }
          }
          if (assets.length) window.CBPortfolio.setAssets(assets);
        }
      }
    } catch (err) { console.warn('Failed to sync portfolio:', err); }
    return data.user;
  },

  // Login and store token (robust to non-JSON/empty responses)
  async login(email, password) {
    const response = await fetch(`${this.API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // Read raw text so we can handle empty or non-JSON responses gracefully
    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error('Login: server returned non-JSON response:', text);
      }
    }

    if (!response.ok) {
      const msg = (data && data.error) ? data.error : `Login failed (${response.status})`;
      throw new Error(msg);
    }

    if (!data || !data.token) {
      throw new Error('Login failed: server did not return token');
    }

    this.setToken(data.token);
    await this.fetchUserProfile();
    return data;
  },

  // Signup (does NOT store token — user must login after)
  async signup(name, email, password) {
    const response = await fetch(`${this.API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    // Try to parse JSON, with fallback for empty responses
    let data;
    const text = await response.text();
    
    if (!text) {
      console.error('Server returned empty response:', response.status);
      throw new Error(`Server error (${response.status}): Empty response`);
    }

    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse JSON:', text);
      throw new Error(`Server returned invalid JSON: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.error || `Signup failed (${response.status})`);
    }

    return data;
  },

  // Logout and clear token/user
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('transactions');
    localStorage.removeItem('balance');
    // Also clear portfolio and balance when logging out
    localStorage.removeItem('portfolio');
    localStorage.removeItem('availableBalance');
    localStorage.removeItem('portfolioTotal');
    // Clear CBPortfolio if available
    if (typeof window !== 'undefined' && window.CBPortfolio && typeof window.CBPortfolio.clearAll === 'function') {
      window.CBPortfolio.clearAll();
    }
  },

  // Ensure authentication and redirect if not logged in
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      throw new Error('Not authenticated');
    }
  },

  // Get authorization header for API calls
  getAuthHeader() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  // Update user profile on backend
  async updateProfile(fullName, email, phone) {
    const token = this.getToken();
    if (!token) throw new Error('No token found. Please log in.');

    const response = await fetch(`${this.API_BASE}/auth/me`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, phone }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update profile');
    }

    const data = await response.json();
    this.setUser(data.user);
    return data.user;
  },
  // Validate token expiry and auto-logout if expired
  validateTokenExpiry() {
    if (!this.isAuthenticated()) return false;
    try {
      const token = this.getToken();
      const payload = JSON.parse(atob(token.split('.')[1])); // decode JWT payload
      const expiresAt = payload.exp * 1000; // convert to ms
      const now = Date.now();
      
      if (now > expiresAt) {
        console.warn('Token expired, logging out...');
        this.logout();
        return false;
      }
      
      // Warn 5 minutes before expiry
      if (now > expiresAt - 5 * 60 * 1000) {
        console.warn('Token expiring soon, please refresh');
      }
      
      return true;
    } catch (err) {
      console.error('Token validation error:', err);
      return false;
    }
  },

  // Start periodic token validation (checks every 30 seconds)
  startTokenValidation(checkIntervalMs = 30000) {
    if (this._tokenCheckInterval) {
      clearInterval(this._tokenCheckInterval);
    }

    this._tokenCheckInterval = setInterval(() => {
      if (!this.validateTokenExpiry()) {
        // Auto-logout on expiry
        window.location.href = '/login.html';
        clearInterval(this._tokenCheckInterval);
      }
    }, checkIntervalMs);

    // Also validate immediately
    if (!this.validateTokenExpiry()) {
      window.location.href = '/login.html';
    }
  },

  // Stop token validation
  stopTokenValidation() {
    if (this._tokenCheckInterval) {
      clearInterval(this._tokenCheckInterval);
      this._tokenCheckInterval = null;
    }
  },
};

// Auto-validate token on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (AuthService.isAuthenticated()) {
      // Validate immediately
      if (!AuthService.validateTokenExpiry()) {
        window.location.href = '/login.html';
      }
      // Start periodic validation
      AuthService.startTokenValidation();
    }
  });

  // Stop validation on page unload
  window.addEventListener('beforeunload', () => {
    AuthService.stopTokenValidation();
  });
}
