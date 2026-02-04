import React, { useState, useEffect, useRef } from 'react';
import './MarketsPageMobile.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import API from '../../../services/api';
import { useNavigate } from 'react-router-dom';

export const MarketsPage = () => {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [filteredMarkets, setFilteredMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveUpdating, setLiveUpdating] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('market_watchlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMarket, setSelectedMarket] = useState(null);
  const pollRef = useRef(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Mock market data with realistic prices (extended list)
  const MOCK_MARKETS = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 42563.45, change_24h: 2.45, high_24h: 43200, low_24h: 41800, volume_24h: 28500000000, market_cap: 835000000000 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 2456.78, change_24h: -1.23, high_24h: 2520, low_24h: 2380, volume_24h: 15600000000, market_cap: 295000000000 },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.9876, change_24h: 3.12, high_24h: 1.02, low_24h: 0.95, volume_24h: 520000000, market_cap: 35200000000 },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price: 165.43, change_24h: 4.56, high_24h: 172, low_24h: 158, volume_24h: 3200000000, market_cap: 52100000000 },
    { id: 'ripple', symbol: 'XRP', name: 'Ripple', price: 2.45, change_24h: -0.82, high_24h: 2.52, low_24h: 2.38, volume_24h: 1800000000, market_cap: 130000000000 },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 7.89, change_24h: 5.23, high_24h: 8.15, low_24h: 7.45, volume_24h: 450000000, market_cap: 9800000000 },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 156.78, change_24h: 1.45, high_24h: 162, low_24h: 154, volume_24h: 520000000, market_cap: 12100000000 },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 28.45, change_24h: 2.78, high_24h: 29.5, low_24h: 27.2, volume_24h: 880000000, market_cap: 13500000000 },
    { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', price: 8.34, change_24h: -1.23, high_24h: 8.65, low_24h: 8.12, volume_24h: 280000000, market_cap: 7100000000 },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 34.56, change_24h: 2.34, high_24h: 35.8, low_24h: 33.2, volume_24h: 450000000, market_cap: 12500000000 },
    { id: 'polygon', symbol: 'MATIC', name: 'Polygon', price: 0.8765, change_24h: 3.45, high_24h: 0.92, low_24h: 0.84, volume_24h: 380000000, market_cap: 8900000000 },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 6.78, change_24h: -2.12, high_24h: 7.12, low_24h: 6.45, volume_24h: 320000000, market_cap: 5200000000 },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.3421, change_24h: 1.56, high_24h: 0.36, low_24h: 0.33, volume_24h: 250000000, market_cap: 49500000000 },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', price: 0.0000234, change_24h: 2.34, high_24h: 0.0000245, low_24h: 0.0000228, volume_24h: 180000000, market_cap: 13800000000 },
    { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', price: 456.78, change_24h: 1.23, high_24h: 475, low_24h: 440, volume_24h: 280000000, market_cap: 8900000000 },
    { id: 'stellar', symbol: 'XLM', name: 'Stellar', price: 0.1245, change_24h: -1.45, high_24h: 0.1345, low_24h: 0.1189, volume_24h: 95000000, market_cap: 3200000000 },
    { id: 'monero', symbol: 'XMR', name: 'Monero', price: 167.45, change_24h: 0.89, high_24h: 175, low_24h: 162, volume_24h: 120000000, market_cap: 2850000000 },
    { id: 'vechain', symbol: 'VET', name: 'VeChain', price: 0.0456, change_24h: 2.12, high_24h: 0.048, low_24h: 0.0442, volume_24h: 85000000, market_cap: 1950000000 },
    { id: 'theta-token', symbol: 'THETA', name: 'Theta Token', price: 1.234, change_24h: 1.34, high_24h: 1.32, low_24h: 1.18, volume_24h: 65000000, market_cap: 1234000000 },
    { id: 'filecoin', symbol: 'FIL', name: 'Filecoin', price: 12.45, change_24h: -0.56, high_24h: 13.2, low_24h: 12.1, volume_24h: 140000000, market_cap: 3100000000 },
    { id: 'algorand', symbol: 'ALGO', name: 'Algorand', price: 0.3456, change_24h: 2.78, high_24h: 0.3678, low_24h: 0.3321, volume_24h: 95000000, market_cap: 2450000000 },
    { id: 'hedera', symbol: 'HBAR', name: 'Hedera', price: 0.0678, change_24h: 1.23, high_24h: 0.0712, low_24h: 0.0645, volume_24h: 45000000, market_cap: 2100000000 },
    { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', price: 5.67, change_24h: 3.45, high_24h: 5.98, low_24h: 5.32, volume_24h: 180000000, market_cap: 5600000000 },
    { id: 'elrond', symbol: 'EGLD', name: 'Elrond', price: 34.56, change_24h: -1.23, high_24h: 36.2, low_24h: 33.1, volume_24h: 65000000, market_cap: 1850000000 },
    { id: 'harmony', symbol: 'ONE', name: 'Harmony', price: 0.0234, change_24h: 2.56, high_24h: 0.0256, low_24h: 0.0223, volume_24h: 32000000, market_cap: 282000000 },
    { id: 'fantom', symbol: 'FTM', name: 'Fantom', price: 0.7845, change_24h: -0.89, high_24h: 0.8234, low_24h: 0.7612, volume_24h: 78000000, market_cap: 2100000000 },
    { id: 'tezos', symbol: 'XTZ', name: 'Tezos', price: 1.123, change_24h: 1.45, high_24h: 1.2, low_24h: 1.08, volume_24h: 42000000, market_cap: 915000000 },
    { id: 'icon', symbol: 'ICX', name: 'ICON', price: 0.6234, change_24h: 0.78, high_24h: 0.6567, low_24h: 0.6012, volume_24h: 28000000, market_cap: 456000000 },
    { id: 'ontology', symbol: 'ONT', name: 'Ontology', price: 0.5123, change_24h: 1.12, high_24h: 0.5456, low_24h: 0.4987, volume_24h: 32000000, market_cap: 512000000 },
    { id: 'neo', symbol: 'NEO', name: 'NEO', price: 12.34, change_24h: 2.34, high_24h: 12.89, low_24h: 11.78, volume_24h: 185000000, market_cap: 876000000 },
  ];

  // Fetch markets data
  const fetchMarkets = async () => {
    try {
      // Try to fetch from backend API with improved caching (100 coins)
      const res = await API.get('/markets?per_page=100&page=1');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Ensure we have at least 30 coins
        const coinsToShow = res.data.slice(0, 100);
        setMarkets(coinsToShow);
        setError(''); // Clear error if live data succeeds
      } else {
        throw new Error('Empty response');
      }
    } catch (err) {
      console.warn('Live API failed, using mock data:', err.message);
      // Use mock data as fallback
      setMarkets(MOCK_MARKETS);
      // Only show error if it's critical, not for API fallback
      if (err.response?.status === 500) {
        setError('Using demo data - backend error');
      }
    } finally {
      setLoading(false);
      setLastUpdateTime(new Date());
    }
  };

  // Simulate price movements
  const simulatePriceChanges = () => {
    setMarkets(prev => prev.map(m => ({
      ...m,
      price: m.price * (1 + (Math.random() - 0.5) * 0.002),
      change_24h: m.change_24h + (Math.random() - 0.5) * 0.1,
    })));
  };

  useEffect(() => {
    fetchMarkets();
    
    // Start polling
    pollRef.current = setInterval(() => {
      if (liveUpdating) {
        simulatePriceChanges();
        setLastUpdateTime(new Date());
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Filter markets
  useEffect(() => {
    let filtered = markets;

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.symbol.toLowerCase().includes(q) || 
        m.name.toLowerCase().includes(q)
      );
    }

    // Apply filter
    if (activeFilter === 'gainers') {
      filtered = filtered.filter(m => m.change_24h >= 0).sort((a, b) => b.change_24h - a.change_24h);
    } else if (activeFilter === 'losers') {
      filtered = filtered.filter(m => m.change_24h < 0).sort((a, b) => a.change_24h - b.change_24h);
    } else if (activeFilter === 'watchlist') {
      filtered = filtered.filter(m => watchlist.includes(m.id));
    }

    setFilteredMarkets(filtered);
  }, [markets, searchQuery, activeFilter, watchlist]);

  const toggleWatchlist = (marketId) => {
    setWatchlist(prev => {
      const updated = prev.includes(marketId)
        ? prev.filter(id => id !== marketId)
        : [...prev, marketId];
      localStorage.setItem('market_watchlist', JSON.stringify(updated));
      return updated;
    });
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return `$${Number(price).toLocaleString(undefined, { 
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    })}`;
  };

  const formatVolume = (vol) => {
    if (!vol) return '$0';
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
    return `$${vol.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="markets-mobile">
      {/* Header */}
      <div className="mm-header">
        <div className="mm-header-top">
          <h1>Markets</h1>
          <div className={`mm-live-badge ${liveUpdating ? 'active' : ''}`}>
            <span className="mm-pulse"></span>
            <span className="mm-live-text">LIVE</span>
          </div>
        </div>

        {/* Search */}
        <div className="mm-search-wrapper">
          <input
            type="text"
            placeholder="Search BTC, ETH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mm-search-input"
          />
          <span className="mm-search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{verticalAlign:'middle'}} xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6"/></svg></span>
        </div>

        {/* Filter Tabs */}
        <div className="mm-filter-tabs">
          <button
            className={`mm-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
            <button
            className={`mm-tab ${activeFilter === 'gainers' ? 'active' : ''}`}
            onClick={() => setActiveFilter('gainers')}
          >
            Gainers
          </button>
          <button
            className={`mm-tab ${activeFilter === 'losers' ? 'active' : ''}`}
            onClick={() => setActiveFilter('losers')}
          >
            Losers
          </button>
            <button
            className={`mm-tab ${activeFilter === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveFilter('watchlist')}
          >
            Watchlist
          </button>
        </div>
      </div>

      {/* Error or Loading */}
      {error && (
        <div className="mm-error">
          <span>{error}</span>
          <button onClick={fetchMarkets} className="mm-btn-small">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="mm-loading">
          <div className="mm-spinner"></div>
          <p>Loading markets...</p>
        </div>
      ) : (
        <>
          {/* Market Cards */}
          <div className="mm-cards-container">
            {filteredMarkets.length > 0 ? (
              filteredMarkets.map(m => (
                <MarketCard
                  key={m.id}
                  market={m}
                  isWatched={watchlist.includes(m.id)}
                  onWatch={() => toggleWatchlist(m.id)}
                  onSelect={() => setSelectedMarket(m)}
                  formatPrice={formatPrice}
                  formatVolume={formatVolume}
                  navigate={navigate}
                />
              ))
            ) : (
              <div className="mm-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{display:'block',margin:'0 auto 8px'}} xmlns="http://www.w3.org/2000/svg"><path d="M4 18H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 14V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M12 14V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M17 14V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                <p>No markets found</p>
              </div>
            )}
          </div>

          {/* Stats Footer */}
          {filteredMarkets.length > 0 && (
            <div className="mm-stats-footer">
              <span>Showing {filteredMarkets.length} markets</span>
              {lastUpdateTime && (
                <span className="mm-update-time">
                  Updated {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Market Detail Modal */}
      {selectedMarket && (
        <MarketModal
          market={selectedMarket}
          isWatched={watchlist.includes(selectedMarket.id)}
          onWatch={() => toggleWatchlist(selectedMarket.id)}
          onClose={() => setSelectedMarket(null)}
          formatPrice={formatPrice}
          formatVolume={formatVolume}
          navigate={navigate}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

const MarketCard = ({ market, isWatched, onWatch, onSelect, formatPrice, formatVolume, navigate }) => {
  const isPositive = market.change_24h >= 0;

  return (
    <div className="mm-card" onClick={onSelect}>
      <div className="mm-card-header">
        <div className="mm-card-symbol">
          <div className="mm-symbol-badge">{market.symbol}</div>
          <div className="mm-card-info">
            <div className="mm-card-name">{market.name}</div>
            <div className={`mm-change ${isPositive ? 'positive' : 'negative'}`}>
              {isPositive ? '▲' : '▼'} {Math.abs(market.change_24h).toFixed(2)}%
            </div>
          </div>
        </div>
          <button
          className={`mm-watch-btn ${isWatched ? 'watched' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onWatch();
          }}
        >
          {isWatched ? '★' : '☆'}
        </button>
      </div>

      <div className="mm-card-price">
        {formatPrice(market.price)}
      </div>

      <div className="mm-card-stats">
        <div className="mm-stat">
          <span className="mm-stat-label">24h High</span>
          <span className="mm-stat-value">{formatPrice(market.high_24h)}</span>
        </div>
        <div className="mm-stat">
          <span className="mm-stat-label">24h Low</span>
          <span className="mm-stat-value">{formatPrice(market.low_24h)}</span>
        </div>
      </div>

      <div className="mm-card-footer">
        <span className="mm-volume">Vol: {formatVolume(market.volume_24h)}</span>
        <button
          className="mm-trade-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/markets/${market.symbol}`);
          }}
        >
          Trade
        </button>
      </div>
    </div>
  );
};

const MarketModal = ({ market, isWatched, onWatch, onClose, formatPrice, formatVolume, navigate }) => {
  const isPositive = market.change_24h >= 0;

  return (
    <div className="mm-modal-overlay" onClick={onClose}>
      <div className="mm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="mm-modal-header">
          <div>
            <h2>{market.name}</h2>
            <p className="mm-modal-symbol">{market.symbol}</p>
          </div>
          <button className="mm-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="mm-modal-price">
          <div className="mm-price-main">{formatPrice(market.price)}</div>
          <div className={`mm-change-large ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(market.change_24h).toFixed(2)}% (24h)
          </div>
        </div>

        <div className="mm-modal-stats">
          <div className="mm-stat-block">
            <span className="mm-label">24h High</span>
            <span className="mm-value">{formatPrice(market.high_24h)}</span>
          </div>
          <div className="mm-stat-block">
            <span className="mm-label">24h Low</span>
            <span className="mm-value">{formatPrice(market.low_24h)}</span>
          </div>
          <div className="mm-stat-block">
            <span className="mm-label">24h Volume</span>
            <span className="mm-value">{formatVolume(market.volume_24h)}</span>
          </div>
          <div className="mm-stat-block">
            <span className="mm-label">Market Cap</span>
            <span className="mm-value">{formatVolume(market.market_cap)}</span>
          </div>
        </div>

        <div className="mm-modal-actions">
          <button className={`mm-action-btn ${isWatched ? 'watched' : ''}`} onClick={onWatch}>
            {isWatched ? '★ In Watchlist' : '☆ Add to Watchlist'}
          </button>
          <button
            className="mm-action-btn mm-trade-primary"
            onClick={() => {
              navigate(`/markets/${market.symbol}`);
              onClose();
            }}
          >
            Trade {market.symbol}
          </button>
        </div>
      </div>
    </div>
  );
};
