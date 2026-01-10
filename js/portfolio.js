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
    if (derived > 0) return derived;
    // fallback to server-provided total if assets haven't been valuated yet
    return totalPortfolioValue || 0;
  }

  const portfolio = {
    getAssets: () => portfolioAssets,
    getBalance: () => availableBalance,
    getTotalValue: getTotalValue,
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
    setBalance: (balance) => {
      availableBalance = balance;
      console.log('CBPortfolio.setBalance ->', availableBalance);
      saveBalance();
    }
    ,
    setTotalValue: (val) => {
      totalPortfolioValue = Number(val) || 0;
      saveTotal();
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
        const apiBase = (window.__apiBase ? (window.__apiBase + '/api') : ((typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) ? `http://${location.hostname}:5001/api` : '/api'));
        const url = `${apiBase}/prices?symbols=${symbolStr}`;
        console.log('Fetching prices from backend:', url);
        
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn('Failed to fetch prices', resp.status);
          return;
        }
        const prices = await resp.json();
        console.log('Prices fetched:', prices);
        
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

  loadFromStorage();
  window.CBPortfolio = portfolio;
})(window);
