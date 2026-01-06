function renderPortfolioCards(){
  const assets = window.CBPortfolio.getAssets();
  const balance = window.CBPortfolio.getBalance();
  const total = window.CBPortfolio.getTotalValue();
  const active = assets.filter(a => a.amount > 0).length;

  console.log('renderPortfolioCards:', { balance, total, active, assets });
  
  const balEl = document.getElementById('available-balance');
  const totalEl = document.getElementById('total-value');
  if (balEl) balEl.textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  if (totalEl) totalEl.textContent = `$${total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  document.getElementById('active-positions').textContent = active;

  // Mock 24h change
  const change24h = total * 0.0261;
  const changePercent = 2.61;
  document.getElementById('change-24h').textContent = `+$${change24h.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  document.getElementById('change-percent').textContent = `+${changePercent}%`;
}

function renderHoldings(){
  const assets = window.CBPortfolio.getAssets();
  const total = window.CBPortfolio.getTotalValue();
  const tbody = document.getElementById('holdings-body');
  
  if(assets.filter(a => a.amount > 0).length === 0){
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">No holdings yet. Start trading!</td></tr>';
    return;
  }

  tbody.innerHTML = assets
    .filter(a => a.amount > 0)
    .map(asset => `
      <tr>
        <td><strong>${asset.symbol}</strong><br><span class="muted">${asset.name}</span></td>
        <td>${asset.amount.toLocaleString()}</td>
        <td>$${asset.value.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        <td>${total > 0 ? ((asset.value / total) * 100).toFixed(1) : 0}%</td>
        <td><button class="btn" onclick="alert('Trade panel coming soon')">Trade</button></td>
      </tr>
    `).join('');
}

function renderMarketOverview(){
  const tbody = document.getElementById('market-body');
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
    console.log('Dashboard initialized');
  }

  // Initialize immediately
  initializeDashboard();

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
});
