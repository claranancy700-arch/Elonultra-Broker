import React, { useEffect, useState } from 'react';
import API from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import MobilePortfolioCarousel from './MobilePortfolioCarousel';
import MobileActionButtons from './MobileActionButtons';
import MobileBottomNav from './MobileBottomNav';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
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
      try {
        const [pRes, tRes] = await Promise.all([
          API.get('/portfolio'),
          API.get('/transactions'),
        ]);

        if (!mounted) return;
        setPortfolio(pRes.data || null);
        setTransactions(tRes.data?.transactions || []);
      } catch (err) {
        console.error('Dashboard load error', err);
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
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

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="panel">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="panel error">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
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
          <div className="card-value">+$0.00</div>
          <div className="card-change positive">+0%</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Your Holdings</h3>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ fontSize: '12px', padding: '6px 12px' }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Recent Trades</h3>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '12px', padding: '6px 12px' }}
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
