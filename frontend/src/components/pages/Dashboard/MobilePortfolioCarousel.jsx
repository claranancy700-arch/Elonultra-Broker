import React, { useRef, useState, useEffect } from 'react';
import './MobilePortfolioCarousel.css';

// Small SVG icons (no external deps)
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="1" y="5" width="22" height="14" rx="2" />
    <path d="M1 11h22" />
  </svg>
);

const PortfolioIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M16 3v4M8 3v4" />
  </svg>
);

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 3v18h18" />
    <path d="M7 13v6M12 9v10M17 5v14" />
  </svg>
);

// Metallic Donut Chart - Sleek redesigned pie chart
const MetallicDonutChart = ({ positions = [], compact = false }) => {
  if (!positions || positions.length === 0) return <div style={{ color: 'var(--muted)', fontSize: 12 }}>No holdings</div>;

  const vals = positions.map((p) => ({
    coin: p.coin,
    value: p.value ?? (p.amount && p.price ? p.amount * p.price : 0),
  }));
  const total = vals.reduce((s, v) => s + v.value, 0) || 1;
  
  // Bold metallic gradient colors - refined palette
  const colors = [
    { gradient: '#9ca3af', dark: '#6b7280' },
    { gradient: '#b8860b', dark: '#7a5c0b' },
    { gradient: '#808080', dark: '#505050' },
    { gradient: '#a68a2e', dark: '#6b5a1f' },
    { gradient: '#999999', dark: '#666666' },
    { gradient: '#994500', dark: '#663300' },
  ];

  let angle = -90;
  const slices = vals.slice(0, 6).map((v, idx) => {
    const pct = (v.value / total) * 100;
    const sweep = (pct / 100) * 360;
    const start = angle;
    const end = angle + sweep;
    const a1 = (start * Math.PI) / 180;
    const a2 = (end * Math.PI) / 180;
    const r = 55;
    const x1 = 60 + r * Math.cos(a1);
    const y1 = 60 + r * Math.sin(a1);
    const x2 = 60 + r * Math.cos(a2);
    const y2 = 60 + r * Math.sin(a2);
    const large = sweep > 180 ? 1 : 0;
    const d = `M 60 60 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle = end;
    return { d, color: colors[idx % colors.length], coin: v.coin, pct };
  });

  const top = slices.reduce((m, s) => (s.pct > (m.pct || 0) ? s : m), {});

  if (compact) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 8,
        position: 'relative'
      }}>
        {/* Floating animated donut */}
        <svg 
          viewBox="0 0 120 120" 
          preserveAspectRatio="xMidYMid meet" 
          style={{ 
            width: '90px', 
            height: '90px',
            flexShrink: 0,
            animation: 'float-futuristic 5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 8px rgba(107,114,128,0.15)) drop-shadow(0 2px 6px rgba(0,0,0,0.15))'
          }}
        >
          <defs>
            {slices.map((s, i) => (
              <linearGradient key={`grad-${i}`} id={`metallic-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={s.color.gradient} />
                <stop offset="100%" stopColor={s.color.dark} />
              </linearGradient>
            ))}
            <filter id="glow-bold" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Outer bold donut segments */}
          {slices.map((s, i) => (
            <g key={i} style={{ filter: 'url(#glow-bold)' }}>
              <path 
                d={s.d} 
                fill={`url(#metallic-${i})`} 
                opacity="0.65" 
                style={{ 
                  filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.15))`,
                  stroke: 'rgba(255,255,255,0.08)',
                  strokeWidth: '1'
                }} 
              />
            </g>
          ))}
          {/* Bold inner circle (donut hole) */}
          <circle cx="60" cy="60" r="26" fill="rgba(var(--card-rgb), 0.85)" style={{ filter: `drop-shadow(0 1px 4px rgba(0,0,0,0.1))` }} />
          {/* Center glow ring */}
          <circle cx="60" cy="60" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" style={{ filter: 'url(#glow-bold)' }} />
          {/* Decorative outer ring */}
          <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(107,114,128,0.08)" strokeWidth="1" strokeDasharray="3,3" style={{ animation: 'spin-slow 12s linear infinite' }} />
        </svg>

        {/* Coin outlines sidebar */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 4,
          justifyContent: 'center',
          alignItems: 'flex-start'
        }}>
          {slices.map((s, i) => (
            <div 
              key={i} 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: '6px',
                background: `linear-gradient(135deg, ${s.color.gradient}08, ${s.color.dark}05)`,
                border: `1px solid ${s.color.gradient}40`,
                fontSize: '9px',
                fontWeight: '600',
                color: 'rgba(var(--text-rgb), 0.6)',
                animation: `coin-float ${4.5 + i * 0.2}s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
                backdropFilter: 'blur(2px)',
                boxShadow: `0 1px 2px ${s.color.dark}10`,
                whiteSpace: 'nowrap'
              }}
            >
              <span 
                style={{ 
                  width: 5, 
                  height: 5, 
                  borderRadius: '50%', 
                  background: s.color.gradient,
                  boxShadow: `0 0 2px ${s.color.gradient}40`,
                  display: 'inline-block',
                  opacity: 0.7
                }} 
              />
              <span>{s.coin}</span>
              <span style={{ color: 'rgba(var(--text-rgb), 0.4)', fontSize: '8px' }}>{s.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: '100%' }}>
      <svg width="96" height="96" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        <defs>
          {slices.map((s, i) => (
            <linearGradient key={`grad-${i}`} id={`metallic-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={s.color.gradient} />
              <stop offset="100%" stopColor={s.color.dark} />
            </linearGradient>
          ))}
        </defs>
        {/* Outer donut */}
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={`url(#metallic-${i})`} opacity="0.9" style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.2))` }} />
        ))}
        {/* Inner circle (donut hole) */}
        <circle cx="50" cy="50" r="22" fill="rgba(var(--card-rgb), 0.9)" />
        {/* Center highlight */}
        <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      </svg>
      <div style={{ fontSize: 11, color: 'rgba(var(--text-rgb), 0.75)', lineHeight: 1.4 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color.gradient, display: 'inline-block', boxShadow: `0 1px 3px ${s.color.dark}` }} />
            <span style={{ minWidth: 44 }}>{s.coin}</span>
            <span style={{ color: 'rgba(var(--text-rgb), 0.6)' }}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
        {top.coin && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(var(--text-rgb), 0.6)' }}>Top: <strong style={{ color: 'var(--accent)' }}>{top.coin}</strong> ({top.pct.toFixed(1)}%)</div>}
      </div>
    </div>
  );
};

// SVG Pie Chart Component using holdings value (fallback to amount*price)
const PieChart = ({ positions = [], compact = false }) => {
  if (!positions || positions.length === 0) return <div style={{ color: 'var(--muted)', fontSize: 12 }}>No holdings</div>;

  const vals = positions.map((p) => ({
    coin: p.coin,
    value: p.value ?? (p.amount && p.price ? p.amount * p.price : 0),
  }));
  const total = vals.reduce((s, v) => s + v.value, 0) || 1;
  const colors = ['#fbbf24', '#f59e0b', '#d97706', '#92400e', '#b45309', '#ea580c'];

  let angle = -90;
  const slices = vals.slice(0, 6).map((v, idx) => {
    const pct = (v.value / total) * 100;
    const sweep = (pct / 100) * 360;
    const start = angle;
    const end = angle + sweep;
    const a1 = (start * Math.PI) / 180;
    const a2 = (end * Math.PI) / 180;
    const r = 45;
    const x1 = 50 + r * Math.cos(a1);
    const y1 = 50 + r * Math.sin(a1);
    const x2 = 50 + r * Math.cos(a2);
    const y2 = 50 + r * Math.sin(a2);
    const large = sweep > 180 ? 1 : 0;
    const d = `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    angle = end;
    return { d, color: colors[idx % colors.length], coin: v.coin, pct };
  });

  const top = slices.reduce((m, s) => (s.pct > (m.pct || 0) ? s : m), {});

  if (compact) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', maxWidth: 96, maxHeight: 96 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} opacity="0.95" />
          ))}
          <circle cx="50" cy="50" r="18" fill="rgba(var(--card-rgb), 0.85)" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: '100%' }}>
      <svg width="96" height="96" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity="0.95" />
        ))}
        <circle cx="50" cy="50" r="18" fill="rgba(var(--card-rgb), 0.85)" />
      </svg>
      <div style={{ fontSize: 11, color: 'rgba(var(--text-rgb), 0.75)', lineHeight: 1.4 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color, display: 'inline-block' }} />
            <span style={{ minWidth: 44 }}>{s.coin}</span>
            <span style={{ color: 'rgba(var(--text-rgb), 0.6)' }}>{s.pct.toFixed(0)}%</span>
          </div>
        ))}
        {top.coin && <div style={{ marginTop: 6, fontSize: 11, color: 'rgba(var(--text-rgb), 0.6)' }}>Top: <strong style={{ color: 'var(--accent)' }}>{top.coin}</strong> ({top.pct.toFixed(1)}%)</div>}
      </div>
    </div>
  );
};

const MobilePortfolioCarousel = ({ portfolio }) => {
  const [index, setIndex] = useState(0);
  const startX = useRef(null);
  const deltaX = useRef(0);
  const wheelTimeout = useRef(null);
  const containerRef = useRef(null);

  const slides = [0, 1]; // 2 info panels

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };

  const handleTouchMove = (e) => {
    if (startX.current == null) return;
    deltaX.current = e.touches[0].clientX - startX.current;
    // prevent page scroll while interacting with carousel
    if (Math.abs(deltaX.current) > 10) e.preventDefault();
  };

  const handleTouchEnd = () => {
    const d = deltaX.current;
    const threshold = 40;
    if (d < -threshold) setIndex((i) => (i + 1) % slides.length);
    else if (d > threshold) setIndex((i) => (i - 1 + slides.length) % slides.length);
    startX.current = null;
    deltaX.current = 0;
  };

  const handleWheel = (e) => {
    // throttle wheel events
    if (wheelTimeout.current) return;
    wheelTimeout.current = setTimeout(() => {
      clearTimeout(wheelTimeout.current);
      wheelTimeout.current = null;
    }, 200);

    if (e.deltaX > 10) setIndex((i) => (i + 1) % slides.length);
    else if (e.deltaX < -10) setIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  const handleMouseDown = (e) => {
    startX.current = e.clientX;
    deltaX.current = 0;
  };

  const handleMouseMove = (e) => {
    if (startX.current == null) return;
    deltaX.current = e.clientX - startX.current;
  };

  const handleMouseUp = () => {
    const d = deltaX.current;
    const threshold = 40;
    if (d < -threshold) setIndex((i) => (i + 1) % slides.length);
    else if (d > threshold) setIndex((i) => (i - 1 + slides.length) % slides.length);
    startX.current = null;
    deltaX.current = 0;
  };

  const handleMouseLeave = () => {
    startX.current = null;
    deltaX.current = 0;
  };

  const cardData = () => {
    // Map portfolio fields to values used by legacy mobile card
    const total = portfolio?.total_value ?? 0;
    const balance = portfolio?.balance ?? 0;
    const change24 = portfolio?.change_24h ?? 0;
    const positions = portfolio?.positions?.length ?? 0;

    return { total, balance, change24, positions };
  };

  const data = cardData();

  return (
    <div
      className="mobile-portfolio-carousel"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {/* Single Card with Changing Content */}
      <div className="carousel-card single-card mobile-portfolio-card">
        {/* Credit card background SVG - glassy layer */}
        <svg 
          className="credit-card-bg" 
          viewBox="0 0 1004.0031 630.93097" 
          preserveAspectRatio="xMidYMid slice" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.42,
            zIndex: 1,
            pointerEvents: 'none',
            filter: 'brightness(1.45) contrast(1.1)'
          }}
        >
          <image href="/images/basicCreditCard.svg" width="1004.0031" height="630.93097" x="0" y="0" />
        </svg>

        <div className="card-content" style={{ position: 'relative', zIndex: 10 }}>
          {index === 0 ? (
            <div className="card-balance-modern">
              <div className="balance-header">
                <div className="card-title balance-label">Available Balance</div>
                <div className="balance-icon"><WalletIcon /></div>
              </div>
              <div className="balance-amount metallic">${data.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div className={`change-badge metallic ${data.change24 >= 0 ? 'positive' : 'negative'}`} style={{ marginTop: 12 }}>
                <span className="change-arrow">{data.change24 >= 0 ? '▲' : '▼'}</span>
                <span className="change-text">{data.change24 >= 0 ? '+' : ''}{data.change24}%</span>
                <span className="change-label">24h</span>
              </div>
            </div>
          ) : (
            <div className="card-portfolio-two-col">
              <div className="portfolio-left">
                <div className="card-title">Portfolio Value</div>
                <div className="portfolio-value metallic">${data.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>

                <div className="card-title" style={{ marginTop: 12 }}>Positions</div>
                <div className="portfolio-positions metallic">{data.positions}</div>
              </div>

              <div className="portfolio-right">
                <MetallicDonutChart positions={portfolio?.positions || []} compact />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="carousel-dots">
        {slides.map((_, i) => (
          <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>
    </div>
  );
};

export default MobilePortfolioCarousel;
