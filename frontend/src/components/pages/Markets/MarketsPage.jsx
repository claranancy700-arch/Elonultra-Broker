import React, { useState, useEffect } from 'react';
import './MarketsPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('price');
  const [loading, setLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState({
    markets: false,
    trending: false,
    watchlist: false
  });

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/markets');
      const data = await response.json();
      setMarkets(data || []);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarkets = markets
    .filter((m) => m.symbol?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.symbol.localeCompare(b.symbol);
      if (sortBy === 'price') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'change') return (b.change_24h || 0) - (a.change_24h || 0);
      return 0;
    });

  const trendingMarkets = [...markets]
    .sort((a, b) => Math.abs(b.change_24h || 0) - Math.abs(a.change_24h || 0))
    .slice(0, 5);

  const toggleTable = (table) => {
    setExpandedTables(prev => ({ ...prev, [table]: !prev[table] }));
  };

  const MarketTable = ({ title, data, showMarketCap = true, actionLabel = null, onAction = null }) => (
    <div className="table-wrapper">
      <div className="table-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{title}</h3>
          {actionLabel && <button className="btn btn-secondary">{actionLabel}</button>}
        </div>
      </div>
      <table className="markets-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price</th>
            <th className="col-change"><span className="desktop">24h Change</span><span className="mobile">24H</span></th>
            <th className="col-high"><span className="desktop">24h High</span><span className="mobile" aria-hidden="true">▲</span></th>
            <th className="col-low"><span className="desktop">24h Low</span><span className="mobile" aria-hidden="true">▼</span></th>
            <th>Volume</th>
            {showMarketCap && <th>Market Cap</th>}
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((m) => (
              <tr key={m.id || m.symbol}>
                <td className="asset-cell">
                  <span className="asset-symbol">{m.symbol}</span>
                  <span className="asset-name">{m.name}</span>
                </td>
                <td>${m.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className={`change ${m.change_24h >= 0 ? 'positive' : 'negative'}`}>
                  {m.change_24h >= 0 ? '+' : ''}{m.change_24h?.toFixed(2)}%
                </td>
                <td>${m.high_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>${m.low_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>${m.volume_24h?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                {showMarketCap && <td>${m.market_cap?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={showMarketCap ? 7 : 6} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="markets-page">
      <h1>Markets</h1>
      <p className="muted">Real-time cryptocurrency market data</p>

      <div className="search-filter">
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
          <option value="name">Sort by Name</option>
          <option value="price">Sort by Price</option>
          <option value="change">Sort by 24h Change</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading markets...</div>
      ) : (
        <>
          {/* Cryptocurrency Prices Table */}
          <div style={{ marginBottom: '32px' }}>
            <MarketTable
              title="Cryptocurrency Prices"
              data={filteredMarkets}
              showMarketCap={true}
            />
          </div>

          {/* Trending & Watchlist Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '48px' }}>
            <div>
              <h2>Trending Today</h2>
              <MarketTable
                title="Top Movers"
                data={trendingMarkets}
                showMarketCap={false}
              />
            </div>

            <div>
              <h2>Your Watchlist</h2>
              <div className="table-wrapper">
                <div className="table-header">
                  <h3>Watchlist</h3>
                </div>
                <table className="markets-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>
                        No assets in watchlist
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <MobileBottomNav />
    </div>
  );
};

export { MarketsPage };
