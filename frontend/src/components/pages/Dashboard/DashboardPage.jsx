import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { portfolioCache, fetchWithRetry } from '../../../services/portfolioCache';
import MobilePortfolioCarousel from './MobilePortfolioCarousel';
import './DashboardPage.css';

const COIN_COLORS = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#9945ff', BNB: '#f3ba2f',
  XRP: '#00aae4', ADA: '#0033ad', DOT: '#e6007a', LINK: '#2a5ada',
  UNI: '#ff007a', MATIC: '#8247e5', AVAX: '#e84142',
};
const coinColor = (sym) => COIN_COLORS[sym?.toUpperCase()] || '#e84d5c';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const fmt = (n, dp = 2) =>
  Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioWarning, setPortfolioWarning] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError('');
      setPortfolioWarning('');
      const cached = portfolioCache.get();
      if (cached) {
        if (mounted) { setPortfolio(cached); setLoading(false); }
      } else {
        setLoading(true);
      }
      const [pResult, tResult] = await Promise.allSettled([
        fetchWithRetry(() => API.get('/portfolio'), 2),
        API.get('/transactions?limit=6'),
      ]);
      if (!mounted) return;
      if (pResult.status === 'fulfilled') {
        const portfolioData = pResult.value.data || null;
        if (portfolioData) { portfolioCache.save(portfolioData); setPortfolio(portfolioData); }
      } else {
        console.warn('Portfolio fetch failed:', pResult.reason?.message);
        if (!cached) {
          setError(pResult.reason?.response?.data?.error || 'Unable to load portfolio');
        } else {
          const cacheAgeSeconds = Math.round(cached._cacheAge / 1000);
          setPortfolioWarning(`Portfolio data is ${cacheAgeSeconds}s old. Prices may not be current.`);
        }
      }
      if (tResult.status === 'fulfilled') {
        setTransactions(tResult.value.data?.transactions || tResult.value.data || []);
      } else {
        setTransactions([]);
      }
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

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
      <div className="dash">
        <div className="dash-error-panel">
          <strong>Error:</strong> {error}
          <button onClick={handleRetry} className="dash-retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const total        = portfolio?.total_value ?? 0;
  const balance      = portfolio?.balance ?? 0;
  const change24h    = portfolio?.change_24h ?? 0;
  const positions    = portfolio?.positions ?? [];
  // change_24h_value is not sent by the API — derive it from each position's dollar change
  const change24hVal = positions.reduce((sum, pos) => sum + ((pos.value ?? 0) * ((pos.change_24h ?? 0) / 100)), 0);
  const posCount     = positions.length;
  const unrealisedPnl = positions.reduce((s, p) => s + (p.unrealised_pnl ?? 0), 0);
  const allocTotal   = total > 0 ? total : 1;
  const userName     = user?.fullName || user?.fullname || user?.name || user?.email?.split('@')[0] || 'there';

  const activityIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'deposit') return 'deposit';
    if (t === 'withdrawal' || t === 'withdraw') return 'withdraw';
    if (t === 'buy' || t === 'sell' || t === 'trade') return 'trade';
    return 'pending';
  };
  const txBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'success') return 'completed';
    if (s === 'pending') return 'pending';
    return 'failed';
  };
  const txAmountSign  = (type) => { const t=(type||'').toLowerCase(); return (t==='deposit'||t==='sell')?'+': (t==='withdrawal'||t==='withdraw'||t==='buy')?'-':''; };
  const txAmountClass = (type) => { const t=(type||'').toLowerCase(); return (t==='deposit'||t==='sell')?'pos': (t==='withdrawal'||t==='withdraw'||t==='buy')?'neg':'neu'; };
  const txDate = (tx) => {
    const raw = tx.createdAt || tx.created_at;
    if (!raw) return '';
    const d = new Date(raw); const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return `Today, ${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`;
    if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`;
    return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  };

  return (
    <div className="dash">
      {portfolioWarning && (
        <div className="dash-warning-banner">
          ⚠️ {portfolioWarning}
          <button onClick={handleRetry} className="dash-retry-btn">Refresh</button>
        </div>
      )}

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="dash-topbar">
        <div className="dash-greeting">
          <div className="dash-greeting-sub">{getGreeting()}</div>
          <div className="dash-greeting-name">Welcome back, <span>{userName}</span></div>
        </div>
        <div className="dash-topbar-actions">
          <button className="dash-topbtn" onClick={() => navigate('/deposit')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
            Deposit
          </button>
          <button className="dash-topbtn primary" onClick={() => navigate('/markets')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            Trade
          </button>
        </div>
      </div>

      {/* ── MOBILE CAROUSEL (basicCreditCard.svg inside) ──────── */}
      <MobilePortfolioCarousel portfolio={portfolio} />



      {/* ── HERO STRIP (desktop only) ────────────────────────── */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-hero-label">Total Portfolio Value</div>
          <div className="dash-hero-value">${fmt(total)}</div>
          <div className="dash-hero-row">
            <span className={`dash-hero-change ${change24h >= 0 ? 'up' : 'dn'}`}>
              {change24h >= 0 ? '▲' : '▼'} {change24h >= 0 ? '+' : ''}{fmt(change24h)}%
            </span>
            <span className="dash-hero-period">
              {change24hVal >= 0 ? '+' : ''}${fmt(Math.abs(change24hVal))} today
            </span>
          </div>
        </div>
        <div className="dash-hero-right">
          <svg className="dash-hero-chart" viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={change24h >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={change24h >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.02"/>
              </linearGradient>
            </defs>
            <path d="M4,48 L20,40 L36,42 L52,34 L68,36 L84,28 L100,24 L116,18 L132,22 L148,14 L164,10 L180,8 L196,6 L196,58 L4,58 Z" fill="url(#hg)"/>
            <path d="M4,48 L20,40 L36,42 L52,34 L68,36 L84,28 L100,24 L116,18 L132,22 L148,14 L164,10 L180,8 L196,6" fill="none" stroke={change24h >= 0 ? '#10b981' : '#ef4444'} strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="196" cy="6" r="4" fill={change24h >= 0 ? '#10b981' : '#ef4444'}/>
          </svg>
          <div className="dash-hero-stats">
            <div className="dash-hero-stat">
              <div className="dash-hero-stat-label">Available</div>
              <div className="dash-hero-stat-val">${fmt(balance)}</div>
            </div>
            <div className="dash-hero-stat">
              <div className="dash-hero-stat-label">Invested</div>
              <div className="dash-hero-stat-val">${fmt(total - balance)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────── */}
      <div className="dash-stats">
        <div className="dash-stat-card c-green">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <span className={`dash-stat-badge ${change24h >= 0 ? 'badge-up' : 'badge-dn'}`}>
              {change24h >= 0 ? '▲' : '▼'} {fmt(Math.abs(change24h))}%
            </span>
          </div>
          <div className="dash-stat-label">24h Change</div>
          <div className="dash-stat-val">{change24hVal >= 0 ? '+' : ''}${fmt(Math.abs(change24hVal))}</div>
          <div className="dash-stat-sub">Compared to yesterday</div>
        </div>

        <div className="dash-stat-card c-gold">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
            <span className="dash-stat-badge badge-neu">CASH</span>
          </div>
          <div className="dash-stat-label">Available Balance</div>
          <div className="dash-stat-val">${fmt(balance)}</div>
          <div className="dash-stat-sub">Ready to deploy</div>
        </div>

        <div className="dash-stat-card c-blue">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span className="dash-stat-badge badge-neu">ACTIVE</span>
          </div>
          <div className="dash-stat-label">Open Positions</div>
          <div className="dash-stat-val">{posCount}</div>
          <div className="dash-stat-sub">{posCount === 1 ? '1 holding' : `${posCount} holdings`}</div>
        </div>

        <div className="dash-stat-card c-red">
          <div className="dash-stat-top">
            <div className="dash-stat-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className={`dash-stat-badge ${unrealisedPnl >= 0 ? 'badge-up' : 'badge-dn'}`}>
              {unrealisedPnl >= 0 ? 'GAIN' : 'LOSS'}
            </span>
          </div>
          <div className="dash-stat-label">Unrealised P&amp;L</div>
          <div className="dash-stat-val">{unrealisedPnl >= 0 ? '+' : ''}${fmt(Math.abs(unrealisedPnl))}</div>
          <div className="dash-stat-sub">All-time</div>
        </div>
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────── */}
      <div className="dash-main-grid">

        {/* LEFT: Holdings + Activity */}
        <div className="dash-left-col">

          {/* Holdings */}
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div className="dash-panel-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                Your Holdings
              </div>
              <button className="dash-panel-link" onClick={() => navigate('/markets')}>View all →</button>
            </div>
            <div className="dash-holding-cols">
              <div className="dash-col-lbl">Asset</div>
              <div className="dash-col-lbl">Price</div>
              <div className="dash-col-lbl">Value</div>
              <div className="dash-col-lbl">24h</div>
            </div>
            {positions.length > 0 ? positions.map((pos) => (
              <div className="dash-holding-row" key={pos.coin}>
                <div className="dash-holding-asset">
                  <div className="dash-h-icon" style={{ background: coinColor(pos.coin) }}>
                    {(pos.coin?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="dash-h-names">
                    <div className="dash-h-sym">{pos.coin}</div>
                    <div className="dash-h-name">{pos.name || pos.coin} · {pos.amount}</div>
                  </div>
                </div>
                <div className="dash-h-price">${fmt(pos.price)}</div>
                <div className="dash-h-val">${fmt(pos.value)}</div>
                <div className={`dash-h-chg ${(pos.change_24h ?? 0) >= 0 ? 'up' : 'dn'}`}>
                  {(pos.change_24h ?? 0) >= 0 ? '+' : ''}{fmt(pos.change_24h ?? 0)}%
                </div>
              </div>
            )) : (
              <div className="dash-holdings-empty">No holdings yet. Start trading!</div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="dash-panel">
            <div className="dash-panel-head">
              <div className="dash-panel-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Recent Activity
              </div>
              <button className="dash-panel-link" onClick={() => navigate('/transactions')}>See all →</button>
            </div>
            <div className="dash-activity-list">
              {transactions.length > 0 ? transactions.slice(0, 5).map((tx) => (
                <div className="dash-activity-item" key={tx.id}>
                  <div className={`dash-act-icon ${activityIcon(tx.type)}`}>
                    {activityIcon(tx.type) === 'deposit'  && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>}
                    {activityIcon(tx.type) === 'withdraw' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V2M22 12H2"/></svg>}
                    {activityIcon(tx.type) === 'trade'    && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                    {activityIcon(tx.type) === 'pending'  && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                  </div>
                  <div className="dash-act-info">
                    <div className="dash-act-title">
                      {tx.type ? tx.type.charAt(0).toUpperCase() + tx.type.slice(1).toLowerCase() : 'Transaction'}
                      {tx.method || tx.currency ? ` — ${tx.method || tx.currency}` : ''}
                      <span className={`dash-act-badge badge-${txBadge(tx.status)}`}>{tx.status}</span>
                    </div>
                    <div className="dash-act-date">{txDate(tx)}</div>
                  </div>
                  <div className={`dash-act-amount ${txAmountClass(tx.type)}`}>
                    {txAmountSign(tx.type)}${fmt(Math.abs(tx.amount ?? 0))}
                  </div>
                </div>
              )) : (
                <div className="dash-holdings-empty">No recent activity.</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="dash-right-col">

          {/* Quick Actions */}
          <div className="dash-quick-actions">
            <div className="dash-panel-head">
              <div className="dash-panel-title">Quick Actions</div>
            </div>
            <div className="dash-qa-grid">
              <button className="dash-qa-btn" onClick={() => navigate('/deposit')}>
                <div className="dash-qa-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
                </div>
                <span className="dash-qa-label">Deposit</span>
              </button>
              <button className="dash-qa-btn" onClick={() => navigate('/withdrawals')}>
                <div className="dash-qa-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                </div>
                <span className="dash-qa-label">Withdraw</span>
              </button>
            </div>
          </div>

          {/* Allocation */}
          <div className="dash-allocation">
            <div className="dash-panel-head">
              <div className="dash-panel-title">Allocation</div>
              <span className="dash-alloc-count">{posCount} asset{posCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="dash-alloc-body">
              {positions.length > 0 ? positions.map((pos) => {
                const pct = ((pos.value / allocTotal) * 100).toFixed(1);
                return (
                  <div className="dash-alloc-row" key={pos.coin}>
                    <div className="dash-alloc-top">
                      <div className="dash-alloc-name">
                        <div className="dash-alloc-dot" style={{ background: coinColor(pos.coin) }}></div>
                        {pos.name || pos.coin}
                      </div>
                      <div className="dash-alloc-pct">{pct}%</div>
                    </div>
                    <div className="dash-alloc-bar-bg">
                      <div className="dash-alloc-bar-fill" style={{ width: `${pct}%`, background: coinColor(pos.coin), opacity: 0.75 }}></div>
                    </div>
                  </div>
                );
              }) : (
                <div className="dash-holdings-empty" style={{ padding: '20px' }}>No positions yet.</div>
              )}
            </div>
          </div>

          {/* Performance Snapshot */}
          <div className="dash-perf-card">
            <div className="dash-perf-title">Performance Snapshot</div>
            <div className="dash-perf-grid">
              <div className="dash-perf-item">
                <div className="dash-perf-item-lbl">24h Return</div>
                <div className={`dash-perf-item-val ${change24h >= 0 ? 'up' : 'dn'}`}>
                  {change24h >= 0 ? '+' : ''}{fmt(change24h)}%
                </div>
              </div>
              <div className="dash-perf-item">
                <div className="dash-perf-item-lbl">Portfolio</div>
                <div className="dash-perf-item-val text">${fmt(total)}</div>
              </div>
              <div className="dash-perf-item">
                <div className="dash-perf-item-lbl">P&amp;L</div>
                <div className={`dash-perf-item-val ${unrealisedPnl >= 0 ? 'gold' : 'dn'}`}>
                  {unrealisedPnl >= 0 ? '+' : ''}${fmt(Math.abs(unrealisedPnl))}
                </div>
              </div>
              <div className="dash-perf-item">
                <div className="dash-perf-item-lbl">Positions</div>
                <div className="dash-perf-item-val text">{posCount}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};