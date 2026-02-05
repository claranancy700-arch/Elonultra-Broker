/* global AuthService */
function renderPortfolioCards(){
  // Guard against missing CBPortfolio
  if (!window.CBPortfolio) {
    console.warn('CBPortfolio not loaded');
    return;
  }
  
  const assets = window.CBPortfolio.getAssets();
  const balance = window.CBPortfolio.getBalance();
  const total = window.CBPortfolio.getTotalValue();
  const active = assets.filter(a => a.amount > 0).length;

  console.log('renderPortfolioCards:', { balance, total, active, assetsCount: assets.length });
  
  // Update balance display (always show, even if zero)
  const balEl = document.getElementById('available-balance');
  const totalEl = document.getElementById('total-value');
  
  if (!balEl) console.warn('Element available-balance not found');
  if (!totalEl) console.warn('Element total-value not found');
  
  if (balEl) {
    const balDisplay = `$${balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    console.log('Setting available-balance to:', balDisplay);
    balEl.textContent = balDisplay;
  }
  
  if (totalEl) {
    const totalDisplay = `$${total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    console.log('Setting total-value to:', totalDisplay);
    totalEl.textContent = totalDisplay;
  }
  
  const activeEl = document.getElementById('active-positions');
  if (activeEl) activeEl.textContent = active;

  // Calculate 24h change dynamically from portfolio holdings
  let changePercent = 0;
  let change24h = 0;
  
  if (assets.length > 0 && total > 0) {
    // Calculate weighted average 24h change from all holdings
    let weightedChange = 0;
    let totalValue = 0;
    
    assets.forEach(asset => {
      if (asset.amount > 0 && asset.value > 0) {
        // Use asset's change_24h if available, otherwise default to 0
        const assetChange = asset.change_24h || 0;
        const assetWeight = asset.value / total;
        weightedChange += assetChange * assetWeight;
        totalValue += asset.value;
      }
    });
    
    changePercent = totalValue > 0 ? weightedChange : 0;
    change24h = total * (changePercent / 100);
  }
  
  const change24hEl = document.getElementById('change-24h');
  const changePercentEl = document.getElementById('change-percent');
  
  const sign = changePercent >= 0 ? '+' : '';
  if (change24hEl) change24hEl.textContent = `${sign}$${change24h.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  if (changePercentEl) changePercentEl.textContent = `${sign}${changePercent.toFixed(2)}%`;
}

function renderHoldings(){
  // Guard against missing CBPortfolio
  if (!window.CBPortfolio) {
    console.warn('CBPortfolio not loaded');
    return;
  }
  
  const assets = window.CBPortfolio.getAssets();
  const total = window.CBPortfolio.getTotalValue();
  const tbody = document.getElementById('holdings-body');
  
  if(!tbody) {
    console.warn('holdings-body element not found');
    return;
  }

  tbody.innerHTML = assets
    .filter(a => a.amount > 0)
    .map(asset => `
      <tr>
        <td><strong>${asset.symbol}</strong><br><span class="muted">${asset.name || ''}</span></td>
        <td>${asset.amount.toLocaleString()}</td>
        <td>$${(asset.price || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td>$${asset.value.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td>${total > 0 ? ((asset.value / total) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join('');
}

async function renderMarketOverview(){
  const tbody = document.getElementById('market-body');
  // Determine symbols from holdings (only show coins present in holdings)
  const assets = (window.CBPortfolio && typeof window.CBPortfolio.getAssets === 'function') ? window.CBPortfolio.getAssets().filter(a => Number(a.amount) > 0) : [];
  let symbols = assets.map(a => (a.symbol || '').toUpperCase()).filter(Boolean);
  const defaultSymbols = ['BTC','ETH','ADA','SOL'];
  if (!symbols || symbols.length === 0) symbols = defaultSymbols;

  // Use global SYMBOL_MAP if present to resolve CoinGecko ids and names, otherwise fall back to small local maps
  const symbolMeta = (typeof window !== 'undefined' && window.SYMBOL_MAP) ? window.SYMBOL_MAP : { BTC: { id: 'bitcoin', name: 'Bitcoin' }, ETH: { id: 'ethereum', name: 'Ethereum' }, ADA: { id: 'cardano', name: 'Cardano' }, SOL: { id: 'solana', name: 'Solana' }, XRP: { id: 'ripple', name: 'Ripple' }, USDT: { id: 'tether', name: 'Tether' }, USDC: { id: 'usd-coin', name: 'USD Coin' }, DOGE: { id: 'dogecoin', name: 'Dogecoin' }, LTC: { id: 'litecoin', name: 'Litecoin' }, BCH: { id: 'bitcoin-cash', name: 'Bitcoin Cash' } };
  const baseApi = window.__apiBase || '/api';

  try {
    const resp = await fetch(`${baseApi}/prices?symbols=${symbols.join(',')}`);
    if (!resp.ok) throw new Error('Price API returned ' + resp.status);
    const prices = await resp.json();

    const market = symbols.map(sym => {
      const meta = symbolMeta[sym] || { id: (sym||'').toLowerCase(), name: sym };
      const id = meta.id;
      const price = prices[id] && prices[id].usd ? Number(prices[id].usd) : 0;
      return { symbol: sym, name: meta.name || sym, price, change: 0, volume: '' };
    }).filter(m => m.price > 0);

    if (market.length === 0) throw new Error('No prices returned');

    tbody.innerHTML = market.map(m => `
      <tr>
        <td><strong>${m.symbol}</strong><br><span class="muted">${m.name}</span></td>
        <td>$${m.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td style="color:${m.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.change >= 0 ? '+' : ''}${m.change}%</td>
        <td>${m.volume}</td>
        <td><button class="btn btn-success" style="font-size:12px">Buy</button></td>
      </tr>
    `).join('');
    return;
  } catch (err) {
    console.warn('Market API failed, falling back to mock data:', err.message || err);
  }

  // Fallback mock market if API not available
  const mockMarket = [
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.45, volume: '$24.5B' },
    { symbol: 'ETH', name: 'Ethereum', price: 2650.75, change: -1.23, volume: '$12.8B' },
    { symbol: 'ADA', name: 'Cardano', price: 0.485, change: 3.67, volume: '$892M' },
    { symbol: 'SOL', name: 'Solana', price: 98.24, change: 5.12, volume: '$2.1B' },
  ];

  tbody.innerHTML = mockMarket.map(m => `
    <tr>
      <td><strong>${m.symbol}</strong><br><span class="muted">${m.name}</span></td>
      <td>$${m.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td style="color:${m.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.change >= 0 ? '+' : ''}${m.change}%</td>
      <td>${m.volume}</td>
      <td><button class="btn btn-success" style="font-size:12px">Buy</button></td>
    </tr>
  `).join('');
}

// Load and render user's recent trades (shows simulated/admin trades by default)
async function loadUserRecentTrades(){
  const tbody = document.getElementById('trades-body');
  // Guard: if not on dashboard, skip
  if (!tbody) return;
  try{
    if (typeof AuthService === 'undefined' || !AuthService.isAuthenticated()) return;
    const headers = Object.assign({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${AuthService.getToken()}` }, AuthService.getAuthHeader());
    // Fetch both real trades (including loss entries) and simulated/admin trades, then merge
    const apiBase = (AuthService.API_BASE || '/api');
    const [realResp, simResp] = await Promise.all([
      fetch(`${apiBase}/trades?limit=15&isSimulated=false`, { headers }),
      fetch(`${apiBase}/trades?limit=15&isSimulated=true`, { headers })
    ]);
    if (!realResp.ok && !simResp.ok) throw new Error('Trades API returned errors');
    const realJson = realResp.ok ? await realResp.json() : { trades: [] };
    const simJson = simResp.ok ? await simResp.json() : { trades: [] };
    const realTrades = Array.isArray(realJson.trades) ? realJson.trades : [];
    const simTrades = Array.isArray(simJson.trades) ? simJson.trades : [];
    // Merge and sort by created_at desc, prefer realTrades first when timestamps equal
    const trades = [...realTrades, ...simTrades].sort((a,b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    }).slice(0,15);
    if (!trades.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">No trades yet</td></tr>';
      return;
    }

    tbody.innerHTML = trades.map(t => {
      const date = t.created_at ? new Date(t.created_at).toLocaleString() : (t.created_at || '');
      // Handle different trade types
      let typeLabel = '';
      if (t.type === 'loss' || t.status === 'loss') {
        typeLabel = '⚠️ Loss';
      } else if (t.is_simulated) {
        typeLabel = 'Trade';
      } else {
        typeLabel = (t.type || '').toUpperCase();
      }
      return `
        <tr>
          <td>${date}</td>
          <td>${typeLabel}</td>
          <td>${t.asset || ''}</td>
          <td>${Number(t.amount || 0).toLocaleString()}</td>
          <td>$${Number(t.price || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
          <td>$${Number(t.total || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        </tr>
      `;
    }).join('');
  }catch(err){
    console.warn('Failed to load trades', err && err.message ? err.message : err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">Failed to load trades</td></tr>';
  }
}

function switchTab(e, tabId){
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function handleQuickTrade(e){
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  alert(`Trade order: ${data['order-type'].toUpperCase()} ${data.amount} USD of ${data.asset}`);
  e.target.reset();
}

function logout(){
  AuthService.logout(); // This now clears portfolio too
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // First, fetch user profile to populate balance/portfolio from server
  async function initializeDashboard(){
    console.log('initializeDashboard starting; isAuthenticated=', AuthService.isAuthenticated());
    try {
      if(AuthService && AuthService.isAuthenticated()){
        // Clear any old portfolio data from previous user
        if (window.CBPortfolio && typeof window.CBPortfolio.clearAll === 'function') {
          window.CBPortfolio.clearAll();
          console.log('[Dashboard] Cleared old portfolio data');
        }
        console.log('Calling fetchUserProfile and refreshPrices in parallel...');
        // Fetch profile and prices in parallel for faster initialization
        const [user, _] = await Promise.all([
          AuthService.fetchUserProfile(),
          (async () => {
            if (window.CBPortfolio && typeof window.CBPortfolio.refreshPrices === 'function') {
              await window.CBPortfolio.refreshPrices();
            }
          })()
        ]);
        console.log('Fetched user profile:', user);
        console.log('CBPortfolio after parallel fetch:', { balance: window.CBPortfolio.getBalance(), total: window.CBPortfolio.getTotalValue() });
        // Check for admin prompts targeted to this user and show an input prompt if any
        try {
          const headers = Object.assign({ 'Content-Type': 'application/json' }, AuthService.getAuthHeader());
          const resp = await fetch((AuthService.API_BASE || '/api') + '/prompts', { headers });
          if (resp.ok) {
            const j = await resp.json();
            if (j && Array.isArray(j.prompts) && j.prompts.length) {
              for (const p of j.prompts) {
                try {
                  const answer = window.prompt(p.message, '');
                  if (answer !== null) {
                    await fetch((AuthService.API_BASE || '/api') + `/prompts/${p.id}/respond`, { method: 'POST', headers, body: JSON.stringify({ response: answer }) });
                  }
                } catch (_e) { console.warn('Failed to respond to prompt', _e); }
              }
            }
          }
        } catch (e) { console.warn('Prompt check failed', e && e.message ? e.message : e); }
      } else {
        console.warn('Not authenticated or AuthService not available');
      }
    } catch (e) {
      console.warn('Failed to initialize dashboard profile', e);
    }
    // Now render with fetched data — AFTER all async operations complete
    console.log('Rendering portfolio cards after fetch; balance=', window.CBPortfolio.getBalance());
    renderPortfolioCards();
    renderHoldings();
    renderMarketOverview();
    // Load recent trades (admin/simulated trades are shown by default)
    try { await loadUserRecentTrades(); } catch (e) { console.warn('loadUserRecentTrades failed', e); }
    console.log('Dashboard initialized');
  }

  // Initialize when AuthService is available and user is authenticated
  function waitForAuthService() {
    if (typeof AuthService !== 'undefined' && AuthService !== null) {
      if (AuthService.isAuthenticated()) {
        initializeDashboard();
      } else {
        console.log('Dashboard: User not authenticated, skipping initialization');
      }
    } else {
      setTimeout(waitForAuthService, 50);
    }
  }
  waitForAuthService();

  // Periodically refresh profile/portfolio from server so admin changes appear without re-login
  async function refreshFromServer(){
    try{
      if(AuthService && AuthService.isAuthenticated()){
        await AuthService.fetchUserProfile();
        // Recalculate asset values from market prices so holdings derive total
        if (window.CBPortfolio && typeof window.CBPortfolio.refreshPrices === 'function') {
          await window.CBPortfolio.refreshPrices();
        }
        renderPortfolioCards();
        renderHoldings();
        try { await loadUserRecentTrades(); } catch (e) { console.warn('refresh trades failed', e); }
      }
    }catch(e){ console.warn('Failed to refresh profile', e); }
  }

  // initial refresh and then poll every 10 seconds
  setTimeout(refreshFromServer, 1000);
  setInterval(refreshFromServer, 10000);

  // Subscribe to server-sent events for live admin-driven updates
  try{
    if (AuthService.isAuthenticated()){
      const me = AuthService.getUser();
      const userId = me && me.id ? me.id : null;
      if (userId) {
        const sseUrl = `${AuthService.API_BASE.replace(/\/api$/,'')}/api/updates/stream?userId=${userId}`;
        try{
          const evt = new EventSource(sseUrl);
          evt.addEventListener('profile_update', async (ev) => {
            try{
              await AuthService.fetchUserProfile();
              if (window.CBPortfolio && typeof window.CBPortfolio.refreshPrices === 'function') {
                await window.CBPortfolio.refreshPrices();
              }
              renderPortfolioCards();
              renderHoldings();
            }catch(e){ console.warn('Failed to refresh after SSE', e); }
          });
          evt.onopen = () => console.log('SSE connected for user', userId);
          evt.onerror = (e) => console.warn('SSE error', e);
        }catch(e){ console.warn('Failed to open SSE', e); }
      }
    }
  }catch(e){ console.warn('SSE setup skipped', e); }

  // React to immediate balance updates
  window.addEventListener('balance.updated', async (ev) => {
    try {
      renderPortfolioCards();
      renderHoldings();
      try { await loadUserRecentTrades(); } catch(e) { console.warn('balance.updated trades refresh failed', e); }
    } catch (e) { console.warn('balance.updated handler failed', e); }
  });

});