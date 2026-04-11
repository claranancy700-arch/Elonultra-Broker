import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import './MarketsPageNew.css';

/* â”€â”€ static metadata to enrich API data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const COIN_META = {
  bitcoin:   { sector: 'L1',     color: '#f7931a', sup: 19.7e6,  maxSup: 21e6    },
  ethereum:  { sector: 'L1',     color: '#627eea', sup: 120e6,   maxSup: null     },
  solana:    { sector: 'L1',     color: '#9945ff', sup: 476e6,   maxSup: null     },
  binancecoin:{ sector:'L1',     color: '#f3ba2f', sup: 145e6,   maxSup: 200e6    },
  ripple:    { sector: 'L1',     color: '#00aae4', sup: 58.4e9,  maxSup: 100e9   },
  avalanche: { sector: 'L1',     color: '#e84142', sup: 411e6,   maxSup: 720e6    },
  cardano:   { sector: 'L1',     color: '#0033ad', sup: 35.9e9,  maxSup: 45e9    },
  polkadot:  { sector: 'L1',     color: '#e6007a', sup: 1.42e9,  maxSup: null     },
  litecoin:  { sector: 'L1',     color: '#bfbbbb', sup: 74.7e6,  maxSup: 84e6    },
  cosmos:    { sector: 'L1',     color: '#6f7390', sup: 390e6,   maxSup: null     },
  tron:      { sector: 'L1',     color: '#ef0027', sup: 87e9,    maxSup: null     },
  uniswap:   { sector: 'DeFi',   color: '#ff007a', sup: 600e6,   maxSup: 1e9     },
  chainlink: { sector: 'DeFi',   color: '#2a5ada', sup: 598e6,   maxSup: 1e9     },
  aave:      { sector: 'DeFi',   color: '#b6509e', sup: 14.9e6,  maxSup: 16e6    },
  tether:    { sector: 'Stable', color: '#26a17b', sup: 140e9,   maxSup: null     },
  'usd-coin':{ sector: 'Stable', color: '#2775ca', sup: 44e9,    maxSup: null     },
  dogecoin:  { sector: 'Meme',   color: '#c2a633', sup: 144e9,   maxSup: null     },
  'shiba-inu':{ sector:'Meme',   color: '#e4472b', sup: 589e12,  maxSup: null     },
  'matic-network':{ sector:'L2', color:'#8247e5',  sup: 10e9,    maxSup: 10e9    },
  arbitrum:  { sector: 'L2',     color: '#12aaff', sup: 3.97e9,  maxSup: 10e9    },
  optimism:  { sector: 'L2',     color: '#ff0420', sup: 1.36e9,  maxSup: 4.29e9  },
};

const DEFAULT_META = { sector: 'Other', color: '#6b7280', sup: 0, maxSup: null };

/* â”€â”€ sector filter list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SECTORS = ['All', 'L1', 'L2', 'DeFi', 'Stable', 'Meme', 'Other'];

/* â”€â”€ generate a deterministic simulated sparkline path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function genPath(seed, trend) {
  const pts = [];
  let v = 100;
  const rng = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
  for (let i = 0; i < 120; i++) {
    v += (rng(seed + i * 7.3) - 0.5) * 0.015 * v + trend * 0.05;
    v = Math.max(v * 0.7, Math.min(v * 1.3, v));
    pts.push(v);
  }
  return pts;
}

/* â”€â”€ price formatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function fp(p) {
  if (!p && p !== 0) return '$0.00';
  if (p >= 100000) return '$' + p.toLocaleString('en', { maximumFractionDigits: 0 });
  if (p >= 1000)   return '$' + p.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)      return '$' + p.toFixed(4);
  if (p >= 0.01)   return '$' + p.toFixed(5);
  return '$' + p.toFixed(8);
}
function fb(n) {
  if (!n) return '$0';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return '$' + (n / 1e3).toFixed(2)  + 'K';
  return '$' + Number(n).toFixed(0);
}

/* â”€â”€ SVG chart builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function makeChartSVG(pts, up) {
  const W = 800, H = 200, pad = 16;
  const mn = Math.min(...pts), mx = Math.max(...pts), rng = mx - mn || 1;
  const xs = pts.map((_, i) => pad + (i / (pts.length - 1)) * (W - pad * 2));
  const ys = pts.map(p => H - pad - ((p - mn) / rng) * (H - pad * 2));
  const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join('');
  const area = line + ` L${xs[xs.length-1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
  const colVar = up ? 'var(--success)' : 'var(--danger)';
  const colHex = up ? '#10b981' : '#ef4444';
  const gid = 'cg' + Math.random().toString(36).slice(2);
  const ex = xs[xs.length - 1].toFixed(1);
  const ey = ys[ys.length - 1].toFixed(1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 200, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor={colHex} stopOpacity="0.25" />
          <stop offset="80%" stopColor={colHex} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line}  fill="none" stroke={colVar} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r="5" fill={colVar} opacity="0.9" />
      <circle cx={ex} cy={ey} r="10" fill={colVar} opacity="0.15">
        <animate attributeName="r"       values="5;14;5"     dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3"  dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* â”€â”€ Fear & Greed arc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function FGArc({ score }) {
  // r=48 cy=62 keeps stroke (±3.5px) fully inside the 120×70 viewBox
  const r = 48, cx = 60, cy = 62;
  // sweep counter-clockwise (flag=0) → arc goes upward = proper gauge shape
  // angle sweeps from left (-π) toward right (0) proportionally to score
  const endAngle = -Math.PI + (Math.PI * score) / 100;
  const x2 = (cx + r * Math.cos(endAngle)).toFixed(1);
  const y2 = (cy + r * Math.sin(endAngle)).toFixed(1);
  const col = score < 25 ? 'var(--danger)' : score < 75 ? '#f5a623' : 'var(--success)';
  return (
    <svg width="120" height="70" viewBox="0 0 120 70">
      {/* background track: full semicircle, counter-clockwise (upward) */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke="var(--border)" strokeWidth="7" strokeLinecap="round" />
      {/* score arc: always ≤ 180°, so large-arc-flag is always 0 */}
      {score > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${x2} ${y2}`}
          fill="none" stroke={col} strokeWidth="7" strokeLinecap="round" />
      )}
      <circle cx={x2} cy={y2} r="5" fill={col} />
    </svg>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN COMPONENT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export const MarketsPage = () => {
  const navigate = useNavigate();

  /* â”€â”€ raw API data (normalised) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [coins, setCoins]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState('');

  /* â”€â”€ scanner state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [query, setQuery]           = useState('');
  const [sector, setSector]         = useState('All');
  const [sortF, setSortF]           = useState('mcap');
  const [sortAsc, setSortAsc]       = useState(false);

  /* â”€â”€ detail panel state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const [selected, setSelected]     = useState(null);
  const [detailOpen, setDetailOpen] = useState(false); // mobile bottom-sheet
  const [chartTab, setChartTab]     = useState('24H');

  /* â”€â”€ live-drift interval â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const driftRef  = useRef(null);
  const pollRef   = useRef(null);
  const coinsRef  = useRef([]);        // kept in sync for interval closures
  coinsRef.current = coins;

  /* â”€â”€ normalise one API coin into our internal shape â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const normalise = useCallback((raw, index) => {
    const id  = (raw.id || raw.symbol || '').toLowerCase();
    const meta = COIN_META[id] || DEFAULT_META;
    return {
      id,
      sym:    (raw.symbol || '').toUpperCase(),
      name:   raw.name || raw.symbol || '',
      sector: meta.sector,
      color:  meta.color,
      price:  Number(raw.price)        || 0,
      c24h:   Number(raw.change_24h)   || 0,
      c1h:    Number(raw.change_1h)    || (Number(raw.change_24h) * 0.04) || 0,
      c7d:    Number(raw.change_7d)    || (Number(raw.change_24h) * 7 * 0.3) || 0,
      high24: Number(raw.high_24h)     || Number(raw.price) * 1.03,
      low24:  Number(raw.low_24h)      || Number(raw.price) * 0.97,
      vol:    Number(raw.volume_24h)   || 0,
      mcap:   Number(raw.market_cap)   || 0,
      sup:    meta.sup,
      maxSup: meta.maxSup,
      _pts:   genPath(index * 13.7, (Number(raw.change_24h) || 0) > 0 ? 1 : -1),
    };
  }, []);

  /* â”€â”€ fetch from API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const fetchMarkets = useCallback(async () => {
    try {
      const res = await API.get('/markets');
      if (res.data && Array.isArray(res.data)) {
        setCoins(res.data.map(normalise));
        setApiError('');
      }
    } catch (err) {
      console.error('Market fetch error:', err);
      setApiError(err.response?.status
        ? `${err.response.status}: ${err.response.data?.error || 'API error'}`
        : 'Could not reach backend');
    } finally {
      setLoading(false);
    }
  }, [normalise]);

  /* â”€â”€ initial fetch + poll every 8 s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    fetchMarkets();
    pollRef.current = setInterval(fetchMarkets, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchMarkets]);

  /* â”€â”€ local price drift between polls (every 2 s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    driftRef.current = setInterval(() => {
      setCoins(prev => prev.map(c => {
        const drift = (Math.random() - 0.499) * 0.0012;
        const newPrice = c.price * (1 + drift);
        const newPts = [...c._pts.slice(1), c._pts[c._pts.length - 1] * (1 + drift)];
        return {
          ...c,
          price: parseFloat(newPrice.toFixed(
            newPrice >= 1000 ? 2 : newPrice >= 1 ? 4 : 8
          )),
          c24h:  parseFloat((c.c24h + (Math.random() - 0.5) * 0.06).toFixed(2)),
          c1h:   parseFloat((c.c1h  + (Math.random() - 0.5) * 0.03).toFixed(2)),
          _pts: newPts,
        };
      }));
    }, 2000);
    return () => clearInterval(driftRef.current);
  }, []);

  /* ── hide testimony banner on mobile while on this page ── */
  useEffect(() => {
    document.body.classList.add('markets-page');
    return () => document.body.classList.remove('markets-page');
  }, []);

  /* ── filter + sort ── */
  const filtered = React.useMemo(() => {
    let d = [...coins];
    if (sector !== 'All') d = d.filter(c => c.sector === sector);
    if (query.trim()) {
      const q = query.toLowerCase();
      d = d.filter(c => c.sym.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
    }
    d.sort((a, b) => {
      const av = a[sortF], bv = b[sortF];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return d;
  }, [coins, sector, query, sortF, sortAsc]);

  /* â”€â”€ handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleSort = (f) => {
    if (sortF === f) setSortAsc(a => !a);
    else { setSortF(f); setSortAsc(false); }
  };

  const handleSelect = (c) => {
    setSelected(c);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    // keep selected so desktop doesn't blank out
  };

  /* â”€â”€ keep selected coin data fresh while list updates â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (selected) {
      const fresh = coins.find(c => c.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [coins]); // eslint-disable-line

  /* â”€â”€ auto-select first coin on desktop once data loads â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (!loading && coins.length > 0 && !selected && window.innerWidth > 900) {
      setSelected(coins[0]);
    }
  }, [loading, coins]); // eslint-disable-line

  /* â”€â”€ ticker tape items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const tickerCoins = coins.slice(0, 14);

  /* â”€â”€ sort arrow helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const Arr = ({ f }) => (
    <span className={`mkt-sort-arr${sortF === f ? ' on' : ''}`}>
      {sortF === f ? (sortAsc ? '▲' : '▼') : '⬦'}
    </span>
  );

  /* â”€â”€ buy/sell pressure â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const buyPct = selected
    ? Math.max(20, Math.min(80, Math.round(50 + selected.c24h * 2.5)))
    : 50;

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     RENDER
  â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div className="mkt-page">

      {/* â”€â”€ TICKER TAPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tickerCoins.length > 0 && (
        <div className="mkt-ticker-wrap">
          <div className="mkt-ticker-track">
            {[...tickerCoins, ...tickerCoins].map((c, i) => (
              <span key={i} className="mkt-tick-item">
                <span className="mkt-tick-sym">{c.sym}</span>
                <span className="mkt-tick-price">{fp(c.price)}</span>
                <span className={`mkt-tick-chg ${c.c24h >= 0 ? 'up' : 'dn'}`}>
                  {c.c24h >= 0 ? '+' : ''}{c.c24h.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* â”€â”€ TERMINAL BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="mkt-terminal">

        {/* â”€â”€ LEFT: SCANNER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className={`mkt-scanner${detailOpen ? ' mkt-scanner--dimmed' : ''}`}>

          {/* Scanner head */}
          <div className="mkt-scanner-head">
            <div className="mkt-scanner-title">
              <span className="mkt-live-dot" />
              Market Scanner
            </div>

            {/* Search */}
            <div className="mkt-search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            {/* Sector chips */}
            <div className="mkt-chips">
              {SECTORS.map(s => (
                <button
                  key={s}
                  className={`mkt-chip${sector === s ? ' on' : ''}`}
                  onClick={() => setSector(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Sort row */}
          <div className="mkt-sort-row">
            <span onClick={() => handleSort('name')} className={sortF === 'name' ? 'active' : ''}>
              Asset <Arr f="name" />
            </span>
            <span onClick={() => handleSort('price')} className={sortF === 'price' ? 'active' : ''}>
              Price <Arr f="price" />
            </span>
            <span onClick={() => handleSort('c24h')} className={sortF === 'c24h' ? 'active' : ''}>
              24h <Arr f="c24h" />
            </span>
          </div>

          {/* Coin rows */}
          <div className="mkt-coin-list">
            {loading && (
              <div className="mkt-list-loading">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="mkt-row-skeleton" />
                ))}
              </div>
            )}

            {!loading && apiError && filtered.length === 0 && (
              <div className="mkt-list-error">
                <p>{apiError}</p>
                <button onClick={fetchMarkets}>Retry</button>
              </div>
            )}

            {!loading && filtered.map(c => (
              <div
                key={c.id}
                className={`mkt-coin-row${selected?.id === c.id ? ' selected' : ''}`}
                onClick={() => handleSelect(c)}
              >
                <div className="mkt-cr-info">
                  <div className="mkt-cr-icon" style={{ background: c.color }}>{c.sym[0]}</div>
                  <div className="mkt-cr-names">
                    <div className="mkt-cr-sym">{c.sym}</div>
                    <div className="mkt-cr-name">{c.name}</div>
                  </div>
                </div>
                <div className="mkt-cr-price">{fp(c.price)}</div>
                <div className={`mkt-cr-chg ${c.c24h >= 0 ? 'up' : 'dn'}`}>
                  {c.c24h >= 0 ? '+' : ''}{c.c24h.toFixed(2)}%
                </div>
              </div>
            ))}

            {!loading && filtered.length === 0 && !apiError && (
              <div className="mkt-list-empty">No results</div>
            )}
          </div>

          {/* Scanner footer */}
          <div className="mkt-scanner-foot">
            <span><strong>{filtered.length}</strong> assets</span>
            <span className="mkt-foot-live">
              <span className="mkt-live-dot" style={{ marginRight: 5 }} />
              Live
            </span>
          </div>
        </div>

        {/* â”€â”€ RIGHT: DETAIL PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className={`mkt-detail${detailOpen ? ' open' : ''}`}>

          {!selected && (
            <div className="mkt-no-sel">
              <div className="mkt-no-sel-icon">◈</div>
              <p>Select an asset</p>
              <span>Tap any coin in the scanner</span>
            </div>
          )}

          {selected && (
            <>
              {/* Drag handle (mobile) */}
              <div className="mkt-sheet-handle" />

              {/* Detail head */}
              <div className="mkt-detail-head">
                <button className="mkt-back-btn" onClick={handleCloseDetail}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Markets
                </button>

                <div className="mkt-detail-coin">
                  <div className="mkt-detail-icon" style={{ background: selected.color }}>
                    {selected.sym[0]}
                  </div>
                  <div>
                    <h1>{selected.name}</h1>
                    <span className="mkt-dsub">{selected.sym} · {selected.sector}</span>
                  </div>
                </div>

                <div className="mkt-det-price-area">
                  <div className="mkt-det-price">{fp(selected.price)}</div>
                  <div className={`mkt-det-change ${selected.c24h >= 0 ? 'up' : 'dn'}`}>
                    <span className="mkt-det-pill">
                      {selected.c24h >= 0 ? '▲' : '▼'} {Math.abs(selected.c24h).toFixed(2)}% 24h
                    </span>
                    &nbsp;
                    <span className="mkt-det-7d"
                      style={{ color: selected.c7d >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      7d: {selected.c7d >= 0 ? '+' : ''}{selected.c7d.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="mkt-chart-area">
                <div className="mkt-chart-tabs">
                  {['1H','24H','7D','1M','1Y','All'].map(t => (
                    <button
                      key={t}
                      className={`mkt-chart-tab${chartTab === t ? ' on' : ''}`}
                      onClick={() => setChartTab(t)}
                    >{t}</button>
                  ))}
                </div>
                <div className="mkt-chart-canvas">
                  <div className="mkt-chart-overlay">
                    {selected.sym}/USD · {chartTab}
                  </div>
                  {makeChartSVG(selected._pts, selected.c7d >= 0)}
                </div>
              </div>

              {/* Stats grid */}
              <div className="mkt-stats-grid">
                <div className="mkt-stat-card">
                  <div className="mkt-sc-label">Market Cap</div>
                  <div className="mkt-sc-val">{fb(selected.mcap)}</div>
                  <div className="mkt-sc-sub">Total value</div>
                </div>
                <div className="mkt-stat-card">
                  <div className="mkt-sc-label">Volume 24h</div>
                  <div className="mkt-sc-val">{fb(selected.vol)}</div>
                  <div className="mkt-sc-sub">Trading volume</div>
                </div>
                <div className="mkt-stat-card">
                  <div className="mkt-sc-label">24h High</div>
                  <div className="mkt-sc-val" style={{ color: 'var(--success)' }}>
                    {fp(selected.high24)}
                  </div>
                  <div className="mkt-sc-sub">Intraday high</div>
                </div>
                <div className="mkt-stat-card">
                  <div className="mkt-sc-label">24h Low</div>
                  <div className="mkt-sc-val" style={{ color: 'var(--danger)' }}>
                    {fp(selected.low24)}
                  </div>
                  <div className="mkt-sc-sub">Intraday low</div>
                </div>
              </div>

              {/* Buy/sell pressure */}
              <div className="mkt-pressure-section">
                <div className="mkt-pressure-label">
                  <span>Buy Pressure</span>
                  <span>Sell Pressure</span>
                </div>
                <div className="mkt-pressure-track">
                  <div className="mkt-pressure-fill" style={{ width: `${buyPct}%` }} />
                </div>
                <div className="mkt-pressure-pcts">
                  <span className="buy">{buyPct}% Buy</span>
                  <span className="sell">{100 - buyPct}% Sell</span>
                </div>
              </div>

              {/* 52-wk range + supply */}
              <div className="mkt-metrics-row">
                <div className="mkt-metric-card">
                  <div className="mkt-mc-head">52-Week Range</div>
                  {(() => {
                    const rp = Math.max(5, Math.min(95, 55));
                    return (
                      <>
                        <div className="mkt-range-bar">
                          <div className="mkt-range-fill" style={{ width: `${rp}%` }} />
                          <div className="mkt-range-thumb" style={{ left: `${rp}%` }} />
                        </div>
                        <div className="mkt-range-labels">
                          <span>{fp(selected.price * 0.45)}</span>
                          <span>{fp(selected.price * 1.55)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="mkt-metric-card">
                  <div className="mkt-mc-head">Circulating Supply</div>
                  {selected.maxSup ? (
                    <>
                      <div className="mkt-supply-labels">
                        <span>{fb(selected.sup).replace('$', '')} / {fb(selected.maxSup).replace('$', '')}</span>
                        <span className="mkt-s-pct">
                          {((selected.sup / selected.maxSup) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mkt-supply-bg">
                        <div className="mkt-supply-fg"
                          style={{ width: `${Math.min(100, (selected.sup / selected.maxSup) * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <div className="mkt-supply-row">
                        <span>{fb(selected.maxSup - selected.sup).replace('$', '')} remaining</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mkt-supply-labels">
                        <span>{fb(selected.sup).replace('$', '')}</span>
                        <span className="mkt-s-pct">Uncapped</span>
                      </div>
                      <div className="mkt-supply-bg">
                        <div className="mkt-supply-fg mkt-supply-fg--uncapped" style={{ width: '100%' }} />
                      </div>
                      <div className="mkt-supply-row"><span>No maximum supply</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Fear & Greed */}
              <div className="mkt-fg-section">
                <div className="mkt-fg-card">
                  <div className="mkt-fg-meter">
                    <FGArc score={62} />
                  </div>
                  <div className="mkt-fg-text">
                    <div className="mkt-fg-label">Fear &amp; Greed Index</div>
                    <div className="mkt-fg-score">62</div>
                    <div className="mkt-fg-word">Greed</div>
                    <div className="mkt-fg-desc">
                      Markets trending bullish. Investors taking on more risk.
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mkt-action-row">
                <button
                  className="mkt-btn-buy"
                  onClick={() => navigate('/deposit')}
                >
                  Buy {selected.sym}
                </button>
                <button
                  className="mkt-btn-sell"
                  onClick={() => navigate('/withdrawals')}
                >
                  Sell {selected.sym}
                </button>
              </div>
            </>
          )}
        </div>
        {/* mobile overlay backdrop */}
        {detailOpen && (
          <div className="mkt-sheet-backdrop" onClick={handleCloseDetail} />
        )}
      </div>
    </div>
  );
};
