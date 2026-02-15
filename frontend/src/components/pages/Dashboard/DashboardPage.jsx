import React, { useEffect, useState } from 'react';
import API from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { portfolioCache, fetchWithRetry } from '../../../services/portfolioCache';
import MobilePortfolioCarousel from './MobilePortfolioCarousel';
import MobileActionButtons from './MobileActionButtons';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioWarning, setPortfolioWarning] = useState(''); // Non-blocking warning
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(''); // Only for critical errors
  const [activeTab, setActiveTab] = useState('recent-trades');
  const [collapseStates, setCollapseStates] = useState({
    holdings: false,
    trades: false,
  });
  const [tradeForm, setTradeForm] = useState({
    asset: '',
    amount: '',
    orderType: 'buy',
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      setPortfolioWarning('');

      try {
        // Try to fetch portfolio with retry logic
        let portfolioData = null;
        let usesCachedPortfolio = false;

        try {
          const pRes = await fetchWithRetry(() => API.get('/portfolio'), 2);
          portfolioData = pRes.data || null;
          // Cache the successful response
          if (portfolioData) {
            portfolioCache.save(portfolioData);
          }
        } catch (portfolioErr) {
          console.warn('Portfolio fetch failed:', portfolioErr.message);
          // Fall back to cached portfolio instead of failing completely
          const cached = portfolioCache.get();
          if (cached) {
            console.log('Using cached portfolio as fallback');
            portfolioData = cached;
            usesCachedPortfolio = true;
            
            // Show non-blocking warning
            const cacheAgeSeconds = Math.round(cached._cacheAge / 1000);
            setPortfolioWarning(
              `Portfolio data is ${cacheAgeSeconds}s old due to temporary service issues. Prices may not be current.`
            );
          } else {
            // No cache available - this is a real error
            setError(portfolioErr.response?.data?.error || 'Unable to load portfolio');
            // Still try to load transactions
            portfolioData = null;
          }
        }

        if (!mounted) return;

        // Load transactions independently - don't let portfolio errors block them
        try {
          const tRes = await API.get('/transactions?type=trade');
          if (mounted) {
            setTransactions(tRes.data?.transactions || []);
          }
        } catch (txErr) {
          console.warn('Failed to load transactions:', txErr.message);
          // Don't fail dashboard for missing transactions either
          if (mounted) {
            setTransactions([]);
          }
        }

        if (mounted) {
          setPortfolio(portfolioData);
        }
      } catch (err) {
        console.error('Dashboard load error', err);
        if (mounted) {
          setError(err.message || 'Failed to load dashboard');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleCollapse = (section) => {
    setCollapseStates((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleQuickTrade = (e) => {
    e.preventDefault();
    console.log('Quick trade:', tradeForm);
    alert(`Trade executed: ${tradeForm.orderType} ${tradeForm.amount} USD of ${tradeForm.asset}`);
    setTradeForm({ asset: '', amount: '', orderType: 'buy' });
  };

  // Handle retry - reload portfolio data
  const handleRetry = async () => {
    setLoading(true);
    setError('');
    setPortfolioWarning('');
    
    try {
      const pRes = await fetchWithRetry(() => API.get('/portfolio'), 2);
      const portfolioData = pRes.data || null;
      if (portfolioData) {
        portfolioCache.save(portfolioData);
        setPortfolio(portfolioData);
      }
    } catch (err) {
      const cached = portfolioCache.get();
      if (cached) {
        setPortfolio(cached);
        setPortfolioWarning('Still using cached data. Service may be temporarily unavailable.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to reload portfolio');
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't show loading overlay - render page with empty state instead
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="panel error">
          <strong>Error:</strong> {error}
          <button 
            onClick={handleRetry}
            style={{ 
              marginLeft: '12px',
              padding: '6px 12px',
              background: 'var(--primary)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {portfolioWarning && (
        <div style={{
          background: 'rgba(31, 122, 140, 0.08)',
          border: '1px solid rgba(31, 122, 140, 0.3)',
          borderRadius: '6px',
          padding: '12px 14px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'rgba(31, 122, 140, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⚠️ {portfolioWarning}</span>
          <button 
            onClick={handleRetry}
            style={{ 
              background: 'rgba(31, 122, 140, 0.2)',
              color: 'rgba(31, 122, 140, 0.9)',
              border: '1px solid rgba(31, 122, 140, 0.3)',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Refresh
          </button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Dashboard</h1>
        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Welcome, <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{user?.name || user?.email || 'User'}</span>
        </div>
      </div>

      {/* Mobile Portfolio Carousel (3 stacked duplicate cards) - only shows on mobile */}
      <MobilePortfolioCarousel portfolio={portfolio} />

      {/* Mobile Action Buttons - only shows on mobile */}
      <MobileActionButtons />

      {/* Portfolio Summary Cards */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-title">Total Portfolio Value</div>
          <div className="card-value">${portfolio?.total_value?.toFixed(2) ?? '0.00'}</div>
          <div className="card-change positive">+$0.00 (+0%)</div>
        </div>

        <div className="card">
          <div className="card-title">24h Change</div>
          <div className="card-value" style={{ color: portfolio?.change_24h >= 0 ? 'var(--accent-light)' : 'var(--danger)' }}>
            {portfolio?.change_24h >= 0 ? '+' : ''}{portfolio?.change_24h?.toFixed(2) ?? '0.00'}%
          </div>
          <div className={`card-change ${portfolio?.change_24h >= 0 ? 'positive' : 'negative'}`}>
            {portfolio?.change_24h >= 0 ? '+' : ''}{(portfolio?.change_24h_value ?? 0).toFixed(2)} USD
          </div>
        </div>

        <div className="card">
          <div className="card-title">Available Balance</div>
          <div className="card-value">${portfolio?.balance?.toFixed(2) ?? '0.00'}</div>
          <div className="muted" style={{ marginTop: '8px' }}>Ready to invest</div>
        </div>

        <div className="card">
          <div className="card-title">Active Positions</div>
          <div className="card-value">{portfolio?.positions?.length ?? 0}</div>
          <div className="muted" style={{ marginTop: '8px' }}>Holdings</div>
        </div>
      </div>

      {/* Your Holdings Table */}
      <div className="table-wrapper">
        <div className="table-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ flex: 1 }}>Your Holdings</h3>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
              onClick={() => toggleCollapse('holdings')}
            >
              {collapseStates.holdings ? 'See Less' : 'See More'}
            </button>
          </div>
        </div>
        <div 
          className={`holdings-table-wrapper ${collapseStates.holdings ? 'expanded' : ''}`}
        >
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Value</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {portfolio?.positions?.length ? (
                portfolio.positions.map((pos) => (
                  <tr key={pos.coin}>
                    <td>{pos.coin}</td>
                    <td>{pos.amount}</td>
                    <td>${pos.price?.toFixed(2) ?? '0.00'}</td>
                    <td>${pos.value?.toFixed(2) ?? '0.00'}</td>
                    <td>{((pos.value / (portfolio.total_value || 1)) * 100).toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    No holdings yet. Start trading!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabs for Trading & Market Data */}
      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'recent-trades' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent-trades')}
        >
          Recent Trades
        </button>
        <button 
          className={`tab-btn ${activeTab === 'market-overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('market-overview')}
        >
          Market Overview
        </button>
      </div>

      {/* Recent Trades Tab */}
      {activeTab === 'recent-trades' && (
        <div className="tab-content active">
          <div className="table-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <h3 style={{ flex: 1 }}>Recent Trades</h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                onClick={() => toggleCollapse('trades')}
              >
                {collapseStates.trades ? 'See Less' : 'See More'}
              </button>
            </div>
          </div>
          <div className={`trades-table-wrapper ${collapseStates.trades ? 'expanded' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length ? (
                  transactions.slice(0, 10).map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt || tx.created_at).toLocaleString()}</td>
                      <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>{tx.type}</td>
                      <td>{tx.method || tx.currency || 'N/A'}</td>
                      <td>{tx.amount}</td>
                      <td>
                        <span className={`status-pill status-${tx.status?.toLowerCase()}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                      No trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Market Overview Tab */}
      {activeTab === 'market-overview' && (
        <div className="tab-content active">
          <div className="table-wrapper">
            <div className="table-header">
              <h3>Market Overview</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>24h Change</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                    Market data loading...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Trade Panel */}
      <div style={{ marginTop: '48px' }}>
        <h2>Quick Trade</h2>
        <form className="form" onSubmit={handleQuickTrade}>
          <label>
            <span>Asset</span>
            <select 
              value={tradeForm.asset}
              onChange={(e) => setTradeForm({ ...tradeForm, asset: e.target.value })}
              required
            >
              <option value="">Select an asset...</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="ADA">Cardano (ADA)</option>
              <option value="SOL">Solana (SOL)</option>
            </select>
          </label>
          <label>
            <span>Amount (USD)</span>
            <input 
              type="number" 
              placeholder="1000.00" 
              value={tradeForm.amount}
              onChange={(e) => setTradeForm({ ...tradeForm, amount: e.target.value })}
              required
            />
          </label>
          <label>
            <span>Order Type</span>
            <select 
              value={tradeForm.orderType}
              onChange={(e) => setTradeForm({ ...tradeForm, orderType: e.target.value })}
              required
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
          <div className="btn-group">
            <button type="submit" className="btn btn-success">Execute Trade</button>
            <button type="reset" className="btn btn-secondary">Clear</button>
          </div>
        </form>
      </div>
    </div>
  );
};
