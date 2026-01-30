(function(window){
  const PORTFOLIO_KEY = 'portfolio';
  const BALANCE_KEY = 'availableBalance';
  const TOTAL_KEY = 'portfolioTotal';

  const DEFAULT_ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0, value: 0, allocation: 0, color: '#F59E0B' },
    { symbol: 'ETH', name: 'Ethereum', amount: 0, value: 0, allocation: 0, color: '#3B82F6' },
    { symbol: 'ADA', name: 'Cardano', amount: 0, value: 0, allocation: 0, color: '#8B5CF6' },
    { symbol: 'SOL', name: 'Solana', amount: 0, value: 0, allocation: 0, color: '#10B981' },
    { symbol: 'USDC', name: 'USD Coin', amount: 0, value: 0, allocation: 0, color: '#6B7280' }
  ];

  let portfolioAssets = DEFAULT_ASSETS;
  let availableBalance = 5000;
  let totalPortfolioValue = 0;

  function loadFromStorage(){
    try{
      const stored = localStorage.getItem(PORTFOLIO_KEY);
      if(stored) portfolioAssets = JSON.parse(stored);
    }catch(e){ console.error('Failed to parse portfolio:', e); }
    try{
      // debug
      console.log('portfolio.loadFromStorage keys:', {PORTFOLIO_KEY, BALANCE_KEY, TOTAL_KEY});
      console.log('localStorage snapshot:', { portfolio: localStorage.getItem(PORTFOLIO_KEY), balance: localStorage.getItem(BALANCE_KEY), total: localStorage.getItem(TOTAL_KEY) });
    }catch(e){ console.error('Failed to parse portfolio:', e); }
    try{
      const storedBal = localStorage.getItem(BALANCE_KEY);
      if (storedBal !== null) {
        availableBalance = parseFloat(storedBal);
      }
    }catch(e){ console.error('Failed to parse balance:', e); }
    try{
      const storedTotal = localStorage.getItem(TOTAL_KEY);
      if(storedTotal) totalPortfolioValue = parseFloat(storedTotal);
    }catch(e){ console.error('Failed to parse portfolio total:', e); }
  }

  function savePortfolio(){
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolioAssets));
  }

  function saveBalance(){
    localStorage.setItem(BALANCE_KEY, availableBalance.toString());
  }

  function saveTotal(){
    localStorage.setItem(TOTAL_KEY, (totalPortfolioValue || 0).toString());
  }

  function getTotalValue(){
    const derived = portfolioAssets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    const base = (derived > 0) ? derived : (totalPortfolioValue || 0);
    // Include available balance so 'Total Portfolio Value' reflects balance changes immediately
    return base + (Number(availableBalance) || 0);
  }

  function getAssetOnlyValue(){
    // Return only the asset value without balance (for admin panel displays)
    const derived = portfolioAssets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    return (derived > 0) ? derived : (totalPortfolioValue || 0);
  }

  const portfolio = {
    getAssets: () => portfolioAssets,
    getBalance: () => availableBalance,
    getTotalValue: getTotalValue,
    getAssetOnlyValue: getAssetOnlyValue,
    setAssets: (assets) => {
      // Expect assets as array [{symbol, name, amount, value}]
      if (!Array.isArray(assets)) return;
      portfolioAssets = assets.map(a => ({ symbol: a.symbol, name: a.name || a.symbol, amount: Number(a.amount)||0, value: Number(a.value)||0, allocation: 0 }));
      savePortfolio();
    },
    addAsset: (asset) => {
      const existing = portfolioAssets.find(a => a.symbol === asset.symbol);
      if(existing){
        existing.amount += asset.amount;
        existing.value = existing.amount * (asset.value / asset.amount || 0);
      } else {
        portfolioAssets.push(asset);
      }
      savePortfolio();
    },
    updateAsset: (symbol, amount) => {
      const asset = portfolioAssets.find(a => a.symbol === symbol);
      if(asset) asset.amount = amount;
      savePortfolio();
    },
    removeAsset: (symbol) => {
      portfolioAssets = portfolioAssets.filter(a => a.symbol !== symbol);
      savePortfolio();
    },
    // Clear all portfolio data (called on logout)
    clearAll: () => {
      portfolioAssets = DEFAULT_ASSETS.map(a => ({ ...a }));
      availableBalance = 0;
      totalPortfolioValue = 0;
      localStorage.removeItem(PORTFOLIO_KEY);
      localStorage.removeItem(BALANCE_KEY);
      localStorage.removeItem(TOTAL_KEY);
      console.log('[CBPortfolio] Cleared all portfolio data');
    },
    setBalance: (balance) => {
      const prev = availableBalance;
      const newBalance = Number(balance) || 0;
      if (prev === newBalance) {
        console.log('[CBPortfolio.setBalance] No change:', newBalance);
        return; // Skip if no change
      }
      availableBalance = newBalance;
      console.log('[CBPortfolio.setBalance]', prev, '→', newBalance);
      saveBalance();
      // When balance is set to 0, also reset portfolio to ensure fresh calculation
      if (newBalance === 0) {
        console.log('[CBPortfolio.setBalance] Balance is zero, resetting portfolio assets');
        portfolioAssets = DEFAULT_ASSETS.map(a => ({ ...a }));
        totalPortfolioValue = 0;
        savePortfolio();
        saveTotal();
      }
      // Dispatch event SYNCHRONOUSLY so UI listeners react immediately
      try {
        window.dispatchEvent(new CustomEvent('balance.updated', { detail: { previous: prev, current: newBalance } }));
      } catch (e) { console.warn('Failed to dispatch balance.updated event', e); }
    },
    setTotalValue: (val) => {
      totalPortfolioValue = Number(val) || 0;
      saveTotal();
    },

    // Fetch latest balance from server and update immediately
    async syncBalance() {
      try {
        if (typeof AuthService === 'undefined' || !AuthService.isAuthenticated()) return;
        const headers = Object.assign({ 'Content-Type': 'application/json' }, AuthService.getAuthHeader());
        const resp = await fetch((AuthService.API_BASE || '/api') + '/auth/me', { headers });
        if (!resp.ok) return;
        const j = await resp.json();
        const serverBal = typeof j.user?.balance !== 'undefined' ? Number(j.user.balance) : null;
        if (serverBal !== null) {
          console.log('[Portfolio.syncBalance] Server balance:', serverBal, 'Local balance:', availableBalance);
          if (serverBal !== availableBalance) {
            console.log('[Portfolio.syncBalance] Balance changed:', availableBalance, '→', serverBal);
            const prev = availableBalance;
            availableBalance = serverBal;
            saveBalance();
            // IMPORTANT: Dispatch event FIRST so UI listeners can react
            window.dispatchEvent(new CustomEvent('balance.updated', { detail: { previous: prev, current: availableBalance } }));
            // Then refresh prices asynchronously (don't wait for it)
            if (typeof portfolio.refreshPrices === 'function') {
              portfolio.refreshPrices().catch(e => console.warn('refreshPrices failed', e));
            }
          }
        }
      } catch (err) {
        console.warn('CBPortfolio.syncBalance error', err);
      }
    },

    startBalanceWatcher(intervalMs = 2000) {
      // SSE listener
      try {
        if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
          const me = AuthService.getUser();
          const userId = me && me.id ? me.id : null;
          if (userId) {
            const sseUrl = `${AuthService.API_BASE.replace(/\/api$/,'')}/api/updates/stream?userId=${userId}`;
            try {
              const evt = new EventSource(sseUrl);
              evt.addEventListener('profile_update', async (ev) => {
                try { 
                  console.log('[Portfolio] SSE profile_update received');
                  await portfolio.syncBalance(); 
                } catch (e) { console.warn('SSE syncBalance failed', e); }
              });
              evt.onerror = () => { /* ignore - browser handles reconnect */ };
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }

      // periodic poll (faster - 2 seconds instead of 5)
      setInterval(() => { 
        portfolio.syncBalance().catch(e => console.warn('Poll syncBalance failed', e));
      }, intervalMs);
    },
    // Fetch market prices and recalculate asset values & allocations
    refreshPrices: async () => {
      try {
        // Build symbol -> coin id map using global SYMBOL_MAP if available (more comprehensive)
        const globalMap = (typeof window !== 'undefined' && window.SYMBOL_MAP) ? Object.fromEntries(Object.entries(window.SYMBOL_MAP).map(([k,v]) => [k, v.id])) : null;
        const map = globalMap || { BTC: 'bitcoin', ETH: 'ethereum', ADA: 'cardano', SOL: 'solana', USDC: 'usd-coin', USDT: 'tether', XRP: 'ripple' };
        const symbols = portfolioAssets.map(a => (a.symbol || '').toUpperCase()).filter(Boolean);
        if (symbols.length === 0) return;

        // Only request symbols we know how to map to coin ids
        const requestSymbols = symbols.filter(s => map[s]);
        if (requestSymbols.length === 0) {
          console.warn('No known symbols to fetch prices for', symbols);
          return;
        }

        // Call backend API instead of CoinGecko directly (avoids CORS)
        const symbolStr = requestSymbols.join(',');
        // Prefer the centralized window.__apiBase when available (keeps URLs consistent across pages)
        const apiBase = (window.__apiBase ? window.__apiBase : ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? `http://${window.location.hostname}:5001/api` : '/api'));
        const url = `${apiBase}/prices?symbols=${symbolStr}`;
        console.log('Fetching prices from backend:', url);
        
        // Attempt fetch with one retry and fall back to cached prices if API is unavailable
        const CACHE_KEY = 'prices-cache-v1';
        const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

        async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

        let resp = null;
        let attempts = 0;
        let lastErr = null;
        while(attempts < 2){
          try{
            resp = await fetch(url);
            if (resp && resp.ok) break;
            lastErr = new Error('Price fetch failed: ' + (resp ? resp.status : 'no response'));
          }catch(e){ lastErr = e; }
          attempts++;
          // small backoff before retry
          await sleep(500 * attempts);
        }

        let prices = null;
        if (resp && resp.ok){
          prices = await resp.json();
          console.log('Prices fetched:', prices);
          try{ localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), prices })); } catch(e){ /* ignore storage errors */ }
        } else {
          console.warn('Failed to fetch prices from backend, using cached if available', lastErr);
          try{
            const cachedRaw = localStorage.getItem(CACHE_KEY);
            if (cachedRaw){
              const parsed = JSON.parse(cachedRaw);
              if (parsed && parsed.prices){
                const age = Date.now() - (parsed.ts || 0);
                if (age <= CACHE_TTL_MS) {
                  prices = parsed.prices;
                  console.log('Using cached prices (age ms):', age);
                } else {
                  // Allow stale cache as a last resort but log age
                  prices = parsed.prices;
                  console.log('Using stale cached prices (age ms):', age);
                }
              }
            }
          }catch(e){ console.warn('Failed to read cached prices', e); }
        }
        if (!prices){
          console.warn('No prices available (network & cache missing)');
          return;
        }
        
        // Update each asset value = amount * price
        let total = 0;
        for (const a of portfolioAssets) {
          const sym = (a.symbol || '').toUpperCase();
          const id = map[sym];
          const price = id && prices[id] && prices[id].usd ? Number(prices[id].usd) : (Number(a.price) || 0);
          a.price = price;
          a.value = (Number(a.amount) || 0) * price;
          total += a.value;
        }
        // calculate allocations
        if (total > 0) {
          for (const a of portfolioAssets) {
            a.allocation = total > 0 ? ((Number(a.value) || 0) / total) : 0;
          }
        }
        totalPortfolioValue = total;
        console.log('Updated total portfolio value:', totalPortfolioValue);
        savePortfolio();
        saveTotal();
      } catch (err) {
        console.warn('refreshPrices error', err);
      }
    }
  };

  // Only load from storage if user is already authenticated (not on fresh page load)
  // This prevents loading old user data when a new user logs in
  if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
    loadFromStorage();
  }
  
  window.CBPortfolio = portfolio;
  // Start background balance watcher (SSE + periodic poll)
  try { if (window.CBPortfolio && typeof window.CBPortfolio.startBalanceWatcher === 'function') window.CBPortfolio.startBalanceWatcher(); } catch(e) { console.warn('Failed to start balance watcher', e); }
})(window);
