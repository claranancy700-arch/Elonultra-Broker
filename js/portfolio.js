(function(window){
  const PORTFOLIO_KEY = 'portfolio';
  const BALANCE_KEY = 'availableBalance';

  const DEFAULT_ASSETS = [
    { symbol: 'BTC', name: 'Bitcoin', amount: 0, value: 0, allocation: 0, color: '#F59E0B' },
    { symbol: 'ETH', name: 'Ethereum', amount: 0, value: 0, allocation: 0, color: '#3B82F6' },
    { symbol: 'ADA', name: 'Cardano', amount: 0, value: 0, allocation: 0, color: '#8B5CF6' },
    { symbol: 'SOL', name: 'Solana', amount: 0, value: 0, allocation: 0, color: '#10B981' },
    { symbol: 'USDC', name: 'USD Coin', amount: 0, value: 0, allocation: 0, color: '#6B7280' }
  ];

  let portfolioAssets = DEFAULT_ASSETS;
  let availableBalance = 5000;

  function loadFromStorage(){
    try{
      const stored = localStorage.getItem(PORTFOLIO_KEY);
      if(stored) portfolioAssets = JSON.parse(stored);
    }catch(e){ console.error('Failed to parse portfolio:', e); }
    try{
      const storedBal = localStorage.getItem(BALANCE_KEY);
      if(storedBal) availableBalance = parseFloat(storedBal);
    }catch(e){ console.error('Failed to parse balance:', e); }
  }

  function savePortfolio(){
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolioAssets));
  }

  function saveBalance(){
    localStorage.setItem(BALANCE_KEY, availableBalance.toString());
  }

  function getTotalValue(){
    return portfolioAssets.reduce((sum, a) => sum + a.value, 0);
  }

  const portfolio = {
    getAssets: () => portfolioAssets,
    getBalance: () => availableBalance,
    getTotalValue: getTotalValue,
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
      saveBalance();
    }
  };

  loadFromStorage();
  window.CBPortfolio = portfolio;
})(window);
