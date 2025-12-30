const MARKET_DATA = [
  { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.45, high: 43980, low: 42150, volume: '$24.5B', cap: '$847.2B' },
  { symbol: 'ETH', name: 'Ethereum', price: 2650.75, change: -1.23, high: 2720, low: 2610, volume: '$12.8B', cap: '$318.5B' },
  { symbol: 'ADA', name: 'Cardano', price: 0.485, change: 3.67, high: 0.492, low: 0.465, volume: '$892M', cap: '$17.2B' },
  { symbol: 'SOL', name: 'Solana', price: 98.24, change: 5.12, high: 105.25, low: 92.15, volume: '$2.1B', cap: '$39.6B' },
  { symbol: 'XRP', name: 'Ripple', price: 2.45, change: 1.89, high: 2.52, low: 2.38, volume: '$1.8B', cap: '$12.4B' },
  { symbol: 'DOT', name: 'Polkadot', price: 8.35, change: -0.45, high: 8.82, low: 8.12, volume: '$425M', cap: '$8.9B' },
];

function renderMarketTable(){
  const tbody = document.getElementById('market-tbody');
  tbody.innerHTML = MARKET_DATA.map(m => `
    <tr>
      <td><strong>${m.symbol}</strong><br><span class="muted">${m.name}</span></td>
      <td>$${m.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td style="color:${m.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.change >= 0 ? '+' : ''}${m.change}%</td>
      <td>$${m.high.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td>$${m.low.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
      <td>${m.volume}</td>
      <td>${m.cap}</td>
      <td><button class="btn btn-success" style="font-size:12px" onclick="addToWatchlist('${m.symbol}')">Watch</button></td>
    </tr>
  `).join('');
}

function renderTrending(){
  const tbody = document.getElementById('trending-tbody');
  const sorted = [...MARKET_DATA].sort((a, b) => b.change - a.change).slice(0, 5);
  tbody.innerHTML = sorted.map(m => `
    <tr>
      <td><strong>${m.symbol}</strong></td>
      <td style="color:var(--success)">+${m.change}%</td>
    </tr>
  `).join('');
}

function addToWatchlist(symbol){
  alert(`Added ${symbol} to watchlist!`);
}

function logout(){
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  renderMarketTable();
  renderTrending();

  // Search filter
  document.getElementById('market-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('#market-tbody tr').forEach(row => {
      const match = row.textContent.toLowerCase().includes(query);
      row.style.display = match ? '' : 'none';
    });
  });
});
