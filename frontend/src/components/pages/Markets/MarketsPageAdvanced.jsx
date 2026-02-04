import React, { useState, useEffect, useRef } from 'react';
import './MarketsPageAdvanced.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import { useNavigate } from 'react-router-dom';

// Mock market data
const MOCK_MARKETS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 42850, change_24h: 3.24, high_24h: 43200, low_24h: 41800, volume_24h: 28500000000, market_cap: 840000000000 },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2285, change_24h: 2.15, high_24h: 2350, low_24h: 2210, volume_24h: 12300000000, market_cap: 274000000000 },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.95, change_24h: 1.82, high_24h: 0.98, low_24h: 0.92, volume_24h: 520000000, market_cap: 34500000000 },
  { id: 'solana', symbol: 'SOL', name: 'Solana', price: 195.32, change_24h: -1.24, high_24h: 198.50, low_24h: 190.10, volume_24h: 2800000000, market_cap: 63000000000 },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 2.45, change_24h: 4.12, high_24h: 2.52, low_24h: 2.35, volume_24h: 1200000000, market_cap: 130000000000 },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 7.82, change_24h: 0.95, high_24h: 8.05, low_24h: 7.65, volume_24h: 380000000, market_cap: 10200000000 },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.38, change_24h: -2.15, high_24h: 0.40, low_24h: 0.37, volume_24h: 890000000, market_cap: 55000000000 },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 98.50, change_24h: 2.45, high_24h: 101.20, low_24h: 96.30, volume_24h: 680000000, market_cap: 12500000000 },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 18.75, change_24h: 1.55, high_24h: 19.50, low_24h: 18.20, volume_24h: 420000000, market_cap: 14200000000 },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 28.30, change_24h: 3.75, high_24h: 29.50, low_24h: 27.10, volume_24h: 780000000, market_cap: 13500000000 },
];

export const MarketsPage = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState(MOCK_MARKETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [watchlist, setWatchlist] = useState(JSON.parse(localStorage.getItem('market_watchlist') || '[]'));
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const simulationRef = useRef(null);

  // Simulate live price updates
  useEffect(() => {
    simulationRef.current = setInterval(() => {
      setMarkets(prev => 
        prev.map(m => {
          const volatility = Math.random() * 0.002 - 0.001; // ±0.1% per update
          const newPrice = m.price * (1 + volatility);
          const changePercent = ((newPrice - m.price) / m.price * 100) + (Math.random() * 0.1 - 0.05);
          
          return {
            ...m,
            price: parseFloat(newPrice.toFixed(m.symbol === 'BTC' || m.symbol === 'ETH' ? 2 : 4)),
            change_24h: parseFloat(changePercent.toFixed(2)),
            high_24h: Math.max(m.high_24h, newPrice),
            low_24h: Math.min(m.low_24h, newPrice),
            volume_24h: m.volume_24h + (Math.random() * 10000000 - 5000000),
          };
        })
      );
    }, 2000); // Update every 2 seconds

    return () => clearInterval(simulationRef.current);
  }, []);

  // Filter markets
  const filtered = markets
    .filter(m => {
      if (showWatchlistOnly && !watchlist.includes(m.id)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
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

  const toggleWatchlist = (id) => {
    const newWatchlist = watchlist.includes(id)
      ? watchlist.filter(x => x !== id)
      : [...watchlist, id];
    setWatchlist(newWatchlist);
    localStorage.setItem('market_watchlist', JSON.stringify(newWatchlist));
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
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="sort-icon">⬍</span>;
    return <span className="sort-icon active">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="markets-page-advanced">
      {/* Header */}
      <div className="mpa-header">
        <div className="mpa-header-content">
          <div>
            <h1>Live Markets</h1>
            <p className="mpa-subtitle">Real-time cryptocurrency market data with live price simulation</p>
          </div>
          <div className="mpa-header-stats">
            <div className="stat">
              <span className="stat-label">Total Assets</span>
              <span className="stat-value">{markets.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Watchlist</span>
              <span className="stat-value">{watchlist.length}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mpa-controls">
          <div className="mpa-search-box">
            <input
              type="text"
              placeholder="Search by symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mpa-search-input"
            />
            <span className="mpa-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle'}} xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/></svg></span>
          </div>
          <button 
            className={`btn-watchlist-toggle ${showWatchlistOnly ? 'active' : ''}`}
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            title="Show watchlist only"
          >
            ★ {showWatchlistOnly ? 'All' : 'Watchlist'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mpa-table-wrapper">
        <table className="mpa-table">
          <thead>
            <tr>
              <th className="th-watch"></th>
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
              <th onClick={() => handleSort('market_cap')} className="th-sortable th-right">
                Market Cap <SortIcon field="market_cap" />
              </th>
              <th className="th-action">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((m) => {
                const isWatched = watchlist.includes(m.id);
                const isPositive = m.change_24h >= 0;
                
                return (
                  <tr key={m.id} className="mpa-row">
                    <td className="mpa-watch">
                      <button 
                        className={`btn-watch ${isWatched ? 'watched' : ''}`}
                        onClick={() => toggleWatchlist(m.id)}
                        title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {isWatched ? '★' : '☆'}
                      </button>
                    </td>
                    <td className="mpa-symbol" onClick={() => setSelectedMarket(m)}>
                      {m.symbol}
                    </td>
                    <td className="mpa-name" onClick={() => setSelectedMarket(m)}>
                      {m.name}
                    </td>
                    <td className="mpa-price">{formatPrice(m.price)}</td>
                    <td className={`mpa-change ${isPositive ? 'positive' : 'negative'}`}>
                      <span className="change-indicator">{isPositive ? '▲' : '▼'}</span>
                      {m.change_24h.toFixed(2)}%
                    </td>
                    <td className="mpa-high">{formatPrice(m.high_24h)}</td>
                    <td className="mpa-low">{formatPrice(m.low_24h)}</td>
                    <td className="mpa-market-cap">{formatLargeNumber(m.market_cap)}</td>
                    <td className="mpa-action">
                      <button className="btn-trade" onClick={() => alert(`Trading ${m.symbol} - feature coming soon!`)}>
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="mpa-empty-row">
                <td colSpan="9" className="mpa-empty-cell">
                  {searchQuery ? 'No markets match your search' : 'No watchlist items'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info */}
      {filtered.length > 0 && (
        <div className="mpa-info">
          <span>Showing {filtered.length} of {markets.length} markets • Prices update every 2 seconds</span>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMarket && (
        <div className="mpa-modal-overlay" onClick={() => setSelectedMarket(null)}>
          <div className="mpa-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMarket(null)}>×</button>
            <MarketDetail market={selectedMarket} isWatched={watchlist.includes(selectedMarket.id)} onWatchToggle={() => toggleWatchlist(selectedMarket.id)} />
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
};

const MarketDetail = ({ market, isWatched, onWatchToggle }) => {
  const isPositive = market.change_24h >= 0;

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
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="market-detail">
      <div className="detail-header">
        <div>
          <h2>{market.name}</h2>
          <p className="detail-symbol">{market.symbol}</p>
        </div>
        <button 
          className={`btn-watch-large ${isWatched ? 'watched' : ''}`}
          onClick={onWatchToggle}
        >
          {isWatched ? '★ Remove' : '☆ Add'} Watchlist
        </button>
      </div>

      <div className="detail-price">
        <span className="price-value">{formatPrice(market.price)}</span>
        <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{market.change_24h.toFixed(2)}%
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-item">
          <span className="detail-label">24h High</span>
          <span className="detail-value">{formatPrice(market.high_24h)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">24h Low</span>
          <span className="detail-value">{formatPrice(market.low_24h)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Market Cap</span>
          <span className="detail-value">{formatLargeNumber(market.market_cap)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">24h Volume</span>
          <span className="detail-value">{formatLargeNumber(market.volume_24h)}</span>
        </div>
      </div>

      <div className="detail-actions">
        <button className="btn-trade-large">Buy {market.symbol}</button>
        <button className="btn-trade-large secondary">Sell {market.symbol}</button>
      </div>

      <p className="detail-note">Note: Prices are simulated for demo purposes. Connect real API for live data.</p>
    </div>
  );
};
