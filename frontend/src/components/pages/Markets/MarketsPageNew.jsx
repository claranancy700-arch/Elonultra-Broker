import React, { useState, useEffect, useRef } from 'react';
import './MarketsPageNew.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import API from '../../../services/api';
import { useNavigate } from 'react-router-dom';

export const MarketsPage = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveUpdating, setLiveUpdating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const pollRef = useRef(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Fetch markets data
  const fetchMarkets = async () => {
    try {
      // Try without query params first in case backend doesn't support them
      const res = await API.get('/markets');
      if (res.data && Array.isArray(res.data)) {
        setMarkets(res.data);
        setError('');
        setLastUpdateTime(new Date());
      }
    } catch (err) {
      console.error('Market fetch error:', err);
      // If 404, provide helpful message
      if (err.response?.status === 404) {
        setError('Markets endpoint not available. Please ensure the backend is running and the markets route is registered.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Network error. Unable to reach the backend.');
      } else {
        setError('Failed to fetch market data. Please try again.');
      }
    }
  };

  // Start live polling
  const startLivePolling = () => {
    fetchMarkets();
    setLoading(false);
    
    pollRef.current = setInterval(() => {
      if (liveUpdating) {
        fetchMarkets();
      }
    }, 5000); // Update every 5 seconds
  };

  useEffect(() => {
    startLivePolling();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Stop/start polling when toggled
  useEffect(() => {
    if (!liveUpdating && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    } else if (liveUpdating && !pollRef.current) {
      startLivePolling();
    }
  }, [liveUpdating]);

  // Filter markets
  const filtered = markets
    .filter(m => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (m.symbol || '').toLowerCase().includes(q) ||
             (m.name || '').toLowerCase().includes(q) ||
             (m.id || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return `$${Number(price).toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 8 : 2
    })}`;
  };

  const formatLargeNumber = (num) => {
    if (!num) return '$0';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="sort-icon">⬍</span>;
    return <span className="sort-icon active">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="markets-page-new">
      {/* Header */}
      <div className="mp-header">
        <div className="mp-header-content">
          <div>
            <h1>Live Markets</h1>
            <p className="mp-subtitle">Real-time cryptocurrency data powered by CoinGecko</p>
          </div>
          <div className="mp-header-controls">
            <div className={`live-status ${liveUpdating ? 'active' : 'paused'}`}>
              <span className="pulse"></span>
              <span className="status-text">{liveUpdating ? 'LIVE' : 'PAUSED'}</span>
            </div>
            <button 
              className="btn-live-toggle"
              onClick={() => setLiveUpdating(!liveUpdating)}
            >
              {liveUpdating ? '⏸ Pause' : '▶ Resume'}
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mp-controls">
          <div className="mp-search-box">
            <input
              type="text"
              placeholder="Search by symbol, name, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mp-search-input"
            />
            <span className="mp-search-icon">🔍</span>
          </div>
          {lastUpdateTime && (
            <span className="mp-update-time">
              Last updated: {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mp-error">
          <span>⚠️ {error}</span>
          <button onClick={fetchMarkets} className="btn-retry">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mp-loader">
          <div className="spinner"></div>
          <p>Loading market data...</p>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="mp-table-wrapper">
          <table className="mp-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('symbol')} className="th-sortable">
                  Symbol <SortIcon field="symbol" />
                </th>
                <th onClick={() => handleSort('name')} className="th-sortable">
                  Name <SortIcon field="name" />
                </th>
                <th onClick={() => handleSort('price')} className="th-sortable th-right">
                  Price <SortIcon field="price" />
                </th>
                <th onClick={() => handleSort('change_24h')} className="th-sortable th-right">
                  24h Change <SortIcon field="change_24h" />
                </th>
                <th onClick={() => handleSort('high_24h')} className="th-sortable th-right">
                  24h High <SortIcon field="high_24h" />
                </th>
                <th onClick={() => handleSort('low_24h')} className="th-sortable th-right">
                  24h Low <SortIcon field="low_24h" />
                </th>
                <th onClick={() => handleSort('volume_24h')} className="th-sortable th-right">
                  Volume <SortIcon field="volume_24h" />
                </th>
                <th onClick={() => handleSort('market_cap')} className="th-sortable th-right">
                  Market Cap <SortIcon field="market_cap" />
                </th>
                <th className="th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((m) => (
                  <MarketRow 
                    key={m.id} 
                    market={m} 
                    formatPrice={formatPrice}
                    formatLargeNumber={formatLargeNumber}
                    navigate={navigate}
                  />
                ))
              ) : (
                <tr className="mp-empty-row">
                  <td colSpan="9" className="mp-empty-cell">
                    {searchQuery ? 'No markets match your search' : 'No market data available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      {!loading && filtered.length > 0 && (
        <div className="mp-info">
          <span>Showing {filtered.length} of {markets.length} markets</span>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
};

const MarketRow = ({ market, formatPrice, formatLargeNumber, navigate }) => {
  const change24h = market.change_24h || 0;
  const isPositive = change24h >= 0;

  return (
    <tr className="mp-row">
      <td className="mp-symbol">{market.symbol || 'N/A'}</td>
      <td className="mp-name">{market.name || 'Unknown'}</td>
      <td className="mp-price">{formatPrice(market.price)}</td>
      <td className={`mp-change ${isPositive ? 'positive' : 'negative'}`}>
        <span className="change-indicator">{isPositive ? '▲' : '▼'}</span>
        {change24h.toFixed(2)}%
      </td>
      <td className="mp-high">{formatPrice(market.high_24h)}</td>
      <td className="mp-low">{formatPrice(market.low_24h)}</td>
      <td className="mp-volume">{formatLargeNumber(market.volume_24h)}</td>
      <td className="mp-market-cap">{formatLargeNumber(market.market_cap)}</td>
      <td className="mp-action">
        <button 
          className="btn-trade"
          onClick={() => navigate(`/markets/${market.symbol}`)}
        >
          Trade
        </button>
      </td>
    </tr>
  );
};
