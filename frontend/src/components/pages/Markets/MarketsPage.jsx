import React, { useState, useEffect, useRef } from 'react';
import './MarketsPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import API from '../../../services/api';
import { useNavigate } from 'react-router-dom';

const MarketsPage = () => {
  const [markets, setMarkets] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('top');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchMarkets();
    // start live polling from CoinGecko
    startLivePolling();
    return () => stopLivePolling();
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const res = await API.get('/markets');
      setMarkets(res.data || []);
    } catch (err) {
      console.error('fetchMarkets error', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real-time market data from backend `/markets` endpoint
  const fetchExternalMarkets = async () => {
    try {
      const res = await API.get('/markets');
      const data = res?.data || [];
      // Normalize keys (ensure symbol uppercase)
      const mapped = data.map(d => ({
        id: d.id,
        symbol: (d.symbol || d.ticker || d.code || '').toUpperCase(),
        name: d.name || d.title || '',
        price: d.price ?? d.current_price ?? 0,
        change_24h: d.change_24h ?? d.price_change_percentage_24h ?? 0,
        high_24h: d.high_24h ?? d.high ?? 0,
        low_24h: d.low_24h ?? d.low ?? 0,
        volume_24h: d.volume_24h ?? d.total_volume ?? 0,
        market_cap: d.market_cap ?? d.marketcap ?? 0,
      }));
      setMarkets(mapped);
    } catch (err) {
      console.warn('Backend market fetch failed, keeping previous data', err.message);
    }
  };

  const startLivePolling = () => {
    if (pollRef.current) return;
    // fetch immediately then every 5 seconds
    fetchExternalMarkets();
    pollRef.current = setInterval(() => {
      if (live) fetchExternalMarkets();
    }, 5000);
  };

  const stopLivePolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const filtered = markets
    .filter(m => {
      if (!m) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (m.symbol || '').toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q);
    })
    .sort((a,b) => {
      if (filter === 'gainers') return (b.change_24h||0) - (a.change_24h||0);
      if (filter === 'losers') return (a.change_24h||0) - (b.change_24h||0);
      // top by market cap
      return (b.market_cap||0) - (a.market_cap||0);
    });

  return (
    <div className="markets-page modern">
      <header className="markets-hero">
        <div>
          <h1>Markets</h1>
          <p className="muted">Fast, lightweight market overview — tap an asset to trade.</p>
        </div>
        <div className="markets-controls">
          <input className="mp-search" placeholder="Search symbol or name" value={query} onChange={e=>setQuery(e.target.value)} />
          <div className="mp-filters">
            <button className={`chip ${filter==='top'?'active':''}`} onClick={()=>setFilter('top')}>Top</button>
            <button className={`chip ${filter==='gainers'?'active':''}`} onClick={()=>setFilter('gainers')}>Gainers</button>
            <button className={`chip ${filter==='losers'?'active':''}`} onClick={()=>setFilter('losers')}>Losers</button>
          </div>
        </div>
      </header>

      <div className="mp-livebar">
        <span className={`live-dot ${live ? 'on' : 'off'}`}></span>
        <span className="live-label">Live</span>
        <button className="btn btn-small" onClick={() => setLive(prev => !prev)} style={{marginLeft:8}}>{live ? 'Pause' : 'Resume'}</button>
      </div>

      {loading ? (
        <div className="mp-loading">Loading market data...</div>
      ) : (
        <section className="market-cards">
          {filtered.length ? filtered.map(m => (
            <MarketCard key={m.id || m.symbol} m={m} />
          )) : (
            <div className="mp-empty">No markets match your search</div>
          )}
        </section>
      )}

      <MobileBottomNav />
    </div>
  );
};

export { MarketsPage };

const MarketCard = ({ m }) => {
  const navigate = useNavigate();
  const [watched, setWatched] = React.useState(false);

  const openDetail = () => {
    const symbol = m.symbol || m.id || '';
    navigate(`/markets/${symbol}`);
  };

  const toggleWatch = (e) => {
    e.stopPropagation();
    setWatched(prev => !prev);
  };

  return (
    <div className="market-card" onClick={openDetail} role="button" tabIndex={0} onKeyPress={(e)=>{ if(e.key==='Enter') openDetail(); }}>
      <div className="mc-top">
        <div className="mc-symbol">{m.symbol}</div>
        <div className={`mc-change ${ (m.change_24h||0) >=0 ? 'positive' : 'negative' }`}>{(m.change_24h||0).toFixed(2)}%</div>
      </div>
      <div className="mc-price">${Number(m.price||0).toLocaleString(undefined,{maximumFractionDigits:2})}</div>
      <div className="mc-meta">
        <span>Vol: ${Number(m.volume_24h||0).toLocaleString()}</span>
        <span>MC: ${Number(m.market_cap||0).toLocaleString()}</span>
      </div>
      <div className="mc-spark"></div>
      <div className="mc-actions">
        <button className="mc-action-btn" onClick={(e)=>{ e.stopPropagation(); navigate(`/markets/${m.symbol}`); }}>Trade</button>
        <button className={`mc-action-btn ${watched ? 'watched' : ''}`} onClick={toggleWatch}>{watched ? '★ Watchlist' : '☆ Watch'}</button>
      </div>
    </div>
  );
};
