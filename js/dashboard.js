function renderPortfolioCards(){
  const assets = window.CBPortfolio.getAssets();
  const balance = window.CBPortfolio.getBalance();
  const total = window.CBPortfolio.getTotalValue();
  const active = assets.filter(a => a.amount > 0).length;

  document.getElementById('total-value').textContent = `$${total.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
  document.getElementById('available-balance').textContent = `$${balance.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
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
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  renderPortfolioCards();
  renderHoldings();
  renderMarketOverview();
});
