const MARKET_SYMBOLS = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'MATIC', 'AVAX', 'ATOM', 'ARB', 'OP', 'LTC', 'BCH', 'XLM', 'LINK', 'UNI', 'AAVE', 'MKR', 'CRV', 'SNX', 'GMX', 'DYDX', 'LIDO', 'SUI', 'APT', 'NEAR', 'TIA', 'MNT', 'ICP', 'HBAR', 'JUP', 'RAY', 'ORCA', 'PEPE', 'SHIB', 'WIF', 'POPCAT', 'GALA', 'MAGIC', 'BLUR', 'ENS', 'RENDER', 'USDT', 'USDC', 'DAI', 'FRAX'];
let marketData = [];

// Map symbols to CoinGecko IDs and default metadata (50+ coins)
const SYMBOL_MAP = {
  BTC: { id: 'bitcoin', name: 'Bitcoin' },
  ETH: { id: 'ethereum', name: 'Ethereum' },
  BNB: { id: 'binancecoin', name: 'Binance Coin' },
  XRP: { id: 'ripple', name: 'Ripple' },
  ADA: { id: 'cardano', name: 'Cardano' },
  SOL: { id: 'solana', name: 'Solana' },
  DOT: { id: 'polkadot', name: 'Polkadot' },
  DOGE: { id: 'dogecoin', name: 'Dogecoin' },
  MATIC: { id: 'matic-network', name: 'Polygon' },
  AVAX: { id: 'avalanche-2', name: 'Avalanche' },
  ATOM: { id: 'cosmos', name: 'Cosmos' },
  ARB: { id: 'arbitrum', name: 'Arbitrum' },
  OP: { id: 'optimism', name: 'Optimism' },
  LTC: { id: 'litecoin', name: 'Litecoin' },
  BCH: { id: 'bitcoin-cash', name: 'Bitcoin Cash' },
  XLM: { id: 'stellar', name: 'Stellar' },
  LINK: { id: 'chainlink', name: 'Chainlink' },
  UNI: { id: 'uniswap', name: 'Uniswap' },
  AAVE: { id: 'aave', name: 'Aave' },
  MKR: { id: 'makerdao', name: 'Maker' },
  CRV: { id: 'curve-dao-token', name: 'Curve DAO' },
  SNX: { id: 'synthetix', name: 'Synthetix' },
  GMX: { id: 'gmx', name: 'GMX' },
  DYDX: { id: 'dydx', name: 'dYdX' },
  LIDO: { id: 'lido-dao', name: 'Lido DAO' },
  SUI: { id: 'sui', name: 'Sui' },
  APT: { id: 'aptos', name: 'Aptos' },
  NEAR: { id: 'near', name: 'NEAR' },
  TIA: { id: 'celestia', name: 'Celestia' },
  MNT: { id: 'mantle', name: 'Mantle' },
  ICP: { id: 'internet-computer', name: 'Internet Computer' },
  HBAR: { id: 'hedera-hashgraph', name: 'Hedera' },
  JUP: { id: 'jupiter', name: 'Jupiter' },
  RAY: { id: 'raydium', name: 'Raydium' },
  ORCA: { id: 'orca', name: 'Orca' },
  PEPE: { id: 'pepe', name: 'Pepe' },
  SHIB: { id: 'shiba-inu', name: 'Shiba Inu' },
  WIF: { id: 'dogwifcoin', name: 'Dog with Hat' },
  POPCAT: { id: 'popcatsolana', name: 'Popcat' },
  GALA: { id: 'gala', name: 'Gala' },
  MAGIC: { id: 'magic', name: 'Magic' },
  BLUR: { id: 'blur', name: 'Blur' },
  ENS: { id: 'ethereum-name-service', name: 'Ethereum Name Service' },
  RENDER: { id: 'render-token', name: 'Render' },
  USDT: { id: 'tether', name: 'Tether' },
  USDC: { id: 'usd-coin', name: 'USD Coin' },
  DAI: { id: 'dai', name: 'Dai' },
  FRAX: { id: 'frax', name: 'Frax' },
};

async function fetchMarketData(){
  try {
    const apiBase = (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
      ? `http://${location.hostname}:5001/api`
      : '/api';
    const url = `${apiBase}/prices?symbols=${MARKET_SYMBOLS.join(',')}`;
    console.log('Fetching market data:', url);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn('Failed to fetch market prices', resp.status);
      return false;
    }
    const prices = await resp.json();
    console.log('Market prices fetched:', prices);
    
    // Build market data from prices
    marketData = MARKET_SYMBOLS.map(sym => {
      const meta = SYMBOL_MAP[sym];
      const priceData = prices[meta.id];
      const price = priceData && priceData.usd ? Number(priceData.usd) : 0;
      // Mock additional fields for demo (in production, fetch from CoinGecko market_data endpoint)
      return {
        symbol: sym,
        name: meta.name,
        price: price || 0,
        change: Math.random() * 10 - 5, // mock
        high: price * 1.02,
        low: price * 0.98,
        volume: '$' + (Math.random() * 10).toFixed(1) + 'B',
        cap: '$' + (Math.random() * 500).toFixed(1) + 'B',
      };
    }).filter(m => m.price > 0);
    
    return true;
  } catch (err) {
    console.warn('Failed to fetch market data:', err);
    return false;
  }
}

// Fallback mock data if API fails (50+ major cryptocurrencies)
function useMockData(){
  console.log('Using mock market data (API unavailable)');
  marketData = [
    // Layer 1 Blockchains
    { symbol: 'BTC', name: 'Bitcoin', price: 93725, change: 2.45, high: 95500, low: 91200, volume: '$24.5B', cap: '$1847.2B' },
    { symbol: 'ETH', name: 'Ethereum', price: 3239.42, change: -1.23, high: 3300, low: 3150, volume: '$12.8B', cap: '$389.5B' },
    { symbol: 'BNB', name: 'Binance Coin', price: 618.45, change: 1.67, high: 625.50, low: 610.20, volume: '$1.2B', cap: '$94.5B' },
    { symbol: 'SOL', name: 'Solana', price: 150.24, change: 5.12, high: 158.25, low: 145.15, volume: '$2.1B', cap: '$65.6B' },
    { symbol: 'ADA', name: 'Cardano', price: 0.423, change: 3.67, high: 0.432, low: 0.408, volume: '$892M', cap: '$15.2B' },
    { symbol: 'DOT', name: 'Polkadot', price: 8.15, change: -0.45, high: 8.32, low: 8.02, volume: '$425M', cap: '$10.9B' },
    { symbol: 'ATOM', name: 'Cosmos', price: 7.35, change: 0.68, high: 7.50, low: 7.15, volume: '$180M', cap: '$5.2B' },
    // Major Altcoins
    { symbol: 'XRP', name: 'Ripple', price: 2.37, change: 1.89, high: 2.42, low: 2.32, volume: '$1.8B', cap: '$128.4B' },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.315, change: 2.34, high: 0.325, low: 0.308, volume: '$450M', cap: '$45.2B' },
    { symbol: 'LTC', name: 'Litecoin', price: 185.62, change: 0.92, high: 188.50, low: 183.20, volume: '$420M', cap: '$15.8B' },
    { symbol: 'BCH', name: 'Bitcoin Cash', price: 425.35, change: -1.45, high: 432.50, low: 418.20, volume: '$185M', cap: '$8.5B' },
    { symbol: 'XLM', name: 'Stellar', price: 0.285, change: 0.95, high: 0.295, low: 0.278, volume: '$45M', cap: '$9.2B' },
    // Layer 2s & Sidechains
    { symbol: 'MATIC', name: 'Polygon', price: 0.748, change: -0.56, high: 0.765, low: 0.735, volume: '$320M', cap: '$7.5B' },
    { symbol: 'AVAX', name: 'Avalanche', price: 32.48, change: 3.21, high: 33.50, low: 31.20, volume: '$280M', cap: '$11.8B' },
    { symbol: 'ARB', name: 'Arbitrum', price: 1.05, change: 1.15, high: 1.08, low: 1.02, volume: '$280M', cap: '$3.8B' },
    { symbol: 'OP', name: 'Optimism', price: 3.42, change: 0.85, high: 3.52, low: 3.35, volume: '$145M', cap: '$2.5B' },
    // DeFi Protocols
    { symbol: 'LINK', name: 'Chainlink', price: 28.75, change: 2.67, high: 29.50, low: 27.80, volume: '$580M', cap: '$13.2B' },
    { symbol: 'UNI', name: 'Uniswap', price: 9.82, change: 1.23, high: 10.05, low: 9.60, volume: '$320M', cap: '$7.4B' },
    { symbol: 'AAVE', name: 'Aave', price: 625.48, change: 1.56, high: 638.50, low: 615.20, volume: '$185M', cap: '$9.2B' },
    { symbol: 'MKR', name: 'Maker', price: 2485.35, change: 2.34, high: 2545.00, low: 2425.00, volume: '$95M', cap: '$2.4B' },
    { symbol: 'CRV', name: 'Curve DAO', price: 0.485, change: 0.65, high: 0.505, low: 0.475, volume: '$65M', cap: '$1.8B' },
    { symbol: 'SNX', name: 'Synthetix', price: 2.85, change: 1.28, high: 2.95, low: 2.75, volume: '$45M', cap: '$925M' },
    { symbol: 'GMX', name: 'GMX', price: 35.25, change: 3.45, high: 36.50, low: 34.20, volume: '$125M', cap: '$1.2B' },
    { symbol: 'DYDX', name: 'dYdX', price: 3.45, change: 2.12, high: 3.58, low: 3.35, volume: '$85M', cap: '$985M' },
    { symbol: 'LIDO', name: 'Lido DAO', price: 3.95, change: 0.85, high: 4.05, low: 3.85, volume: '$125M', cap: '$4.5B' },
    // Emerging Layer 1s
    { symbol: 'SUI', name: 'Sui', price: 3.85, change: 3.15, high: 3.98, low: 3.72, volume: '$185M', cap: '$9.6B' },
    { symbol: 'APT', name: 'Aptos', price: 10.32, change: 2.48, high: 10.58, low: 10.05, volume: '$95M', cap: '$4.2B' },
    { symbol: 'NEAR', name: 'NEAR', price: 6.24, change: -0.32, high: 6.45, low: 6.05, volume: '$120M', cap: '$6.2B' },
    { symbol: 'TIA', name: 'Celestia', price: 8.64, change: 1.92, high: 8.82, low: 8.45, volume: '$125M', cap: '$3.8B' },
    { symbol: 'MNT', name: 'Mantle', price: 0.625, change: 0.48, high: 0.642, low: 0.615, volume: '$85M', cap: '$2.5B' },
    { symbol: 'ICP', name: 'Internet Computer', price: 12.45, change: 1.32, high: 12.75, low: 12.15, volume: '$55M', cap: '$5.6B' },
    { symbol: 'HBAR', name: 'Hedera', price: 0.085, change: -0.25, high: 0.088, low: 0.083, volume: '$28M', cap: '$2.8B' },
    // Solana Ecosystem (DEX)
    { symbol: 'JUP', name: 'Jupiter', price: 0.875, change: 4.23, high: 0.915, low: 0.845, volume: '$95M', cap: '$2.8B' },
    { symbol: 'RAY', name: 'Raydium', price: 2.35, change: 1.85, high: 2.42, low: 2.28, volume: '$35M', cap: '$745M' },
    { symbol: 'ORCA', name: 'Orca', price: 1.58, change: 0.95, high: 1.65, low: 1.52, volume: '$28M', cap: '$425M' },
    // Meme/Community Coins
    { symbol: 'PEPE', name: 'Pepe', price: 0.0000098, change: 5.23, high: 0.0000102, low: 0.0000095, volume: '$85M', cap: '$4.1B' },
    { symbol: 'SHIB', name: 'Shiba Inu', price: 0.0000185, change: 2.45, high: 0.0000192, low: 0.0000180, volume: '$95M', cap: '$10.8B' },
    { symbol: 'WIF', name: 'Dog with Hat', price: 3.18, change: 4.56, high: 3.32, low: 3.05, volume: '$280M', cap: '$3.2B' },
    { symbol: 'POPCAT', name: 'Popcat', price: 0.845, change: 2.35, high: 0.865, low: 0.825, volume: '$32M', cap: '$1.2B' },
    // NFT/Gaming
    { symbol: 'GALA', name: 'Gala', price: 0.045, change: 0.78, high: 0.047, low: 0.043, volume: '$15M', cap: '$1.4B' },
    { symbol: 'MAGIC', name: 'Magic', price: 0.625, change: 2.15, high: 0.645, low: 0.608, volume: '$45M', cap: '$625M' },
    // Other DeFi
    { symbol: 'BLUR', name: 'Blur', price: 0.565, change: -0.95, high: 0.585, low: 0.545, volume: '$45M', cap: '$850M' },
    { symbol: 'ENS', name: 'Ethereum Name Service', price: 18.75, change: 1.23, high: 19.25, low: 18.45, volume: '$85M', cap: '$745M' },
    { symbol: 'RENDER', name: 'Render', price: 8.23, change: 1.67, high: 8.42, low: 8.05, volume: '$65M', cap: '$3.2B' },
    // Stablecoins
    { symbol: 'USDT', name: 'Tether', price: 1.00, change: 0.01, high: 1.01, low: 0.99, volume: '$70B', cap: '$115B' },
    { symbol: 'USDC', name: 'USD Coin', price: 1.00, change: 0.02, high: 1.01, low: 0.99, volume: '$25B', cap: '$34B' },
    { symbol: 'DAI', name: 'Dai', price: 1.01, change: 0.05, high: 1.02, low: 0.99, volume: '$380M', cap: '$5.2B' },
    { symbol: 'FRAX', name: 'Frax', price: 0.998, change: -0.05, high: 1.01, low: 0.98, volume: '$85M', cap: '$980M' },
  ];
}function renderMarketTable(){
  const tbody = document.getElementById('market-tbody');
  if (marketData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted)">Loading market data...</td></tr>';
    return;
  }
  tbody.innerHTML = marketData.map(m => `
    <tr>
      <td><strong>${m.symbol}</strong><br><span class="muted">${m.name}</span></td>
      <td>$${m.price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:m.price < 1 ? 4 : 2})}</td>
      <td style="color:${m.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.change >= 0 ? '+' : ''}${m.change.toFixed(2)}%</td>
      <td>$${m.high.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:m.high < 1 ? 4 : 2})}</td>
      <td>$${m.low.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:m.low < 1 ? 4 : 2})}</td>
      <td>${m.volume}</td>
      <td>${m.cap}</td>
      <td><button class="btn btn-success" style="font-size:12px" onclick="addToWatchlist('${m.symbol}')">Watch</button></td>
    </tr>
  `).join('');
}

function renderTrending(){
  const tbody = document.getElementById('trending-tbody');
  if (marketData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';
    return;
  }
  const sorted = [...marketData].sort((a, b) => b.change - a.change).slice(0, 5);
  tbody.innerHTML = sorted.map(m => `
    <tr>
      <td><strong>${m.symbol}</strong></td>
      <td style="color:${m.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${m.change >= 0 ? '+' : ''}${m.change.toFixed(2)}%</td>
    </tr>
  `).join('');
}

function addToWatchlist(symbol){
  alert(`Added ${symbol} to watchlist!`);
}

function logout(){
  AuthService.logout();
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure user is authenticated
  if (!AuthService || !AuthService.isAuthenticated()) {
    window.location.href = '/login.html';
    return;
  }
  
  // Fetch and render market data
  const success = await fetchMarketData();
  if (!success) {
    useMockData();
  }
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

  // Sort select
  document.getElementById('sort-select').addEventListener('change', (e) => {
    const sortBy = e.target.value;
    if (sortBy === 'name') marketData.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'price') marketData.sort((a, b) => b.price - a.price);
    else if (sortBy === 'change') marketData.sort((a, b) => b.change - a.change);
    renderMarketTable();
  });
});
