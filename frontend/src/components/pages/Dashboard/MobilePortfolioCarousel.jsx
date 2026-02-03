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

// SVG Pie Chart Component using holdings value (fallback to amount*price)
const PieChart = ({ positions = [] }) => {
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
  const startY = useRef(null);
  const deltaY = useRef(0);
  const wheelTimeout = useRef(null);
  const containerRef = useRef(null);
  const [slideHeight, setSlideHeight] = useState(212); // default card height + gap

  const slides = [0, 1, 2];

  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return;
      const card = containerRef.current.querySelector('.carousel-card');
      if (card) {
        const rect = card.getBoundingClientRect();
        const style = window.getComputedStyle(card);
        const marginBottom = parseFloat(style.marginBottom) || 0;
        setSlideHeight(Math.round(rect.height + marginBottom));
      }
    };
    compute();
    window.addEventListener('resize', compute);
    return () => {
      clearTimeout(wheelTimeout.current);
      window.removeEventListener('resize', compute);
    };
  }, []);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    deltaY.current = 0;
  };

  const handleTouchMove = (e) => {
    if (startY.current == null) return;
    deltaY.current = e.touches[0].clientY - startY.current;
    // prevent page scroll while interacting with carousel
    if (Math.abs(deltaY.current) > 10) e.preventDefault();
  };

  const handleTouchEnd = () => {
    const d = deltaY.current;
    const threshold = 40;
    if (d < -threshold) setIndex((i) => (i + 1) % slides.length);
    else if (d > threshold) setIndex((i) => (i - 1 + slides.length) % slides.length);
    startY.current = null;
    deltaY.current = 0;
  };

  const handleWheel = (e) => {
    // throttle wheel events
    if (wheelTimeout.current) return;
    wheelTimeout.current = setTimeout(() => {
      clearTimeout(wheelTimeout.current);
      wheelTimeout.current = null;
    }, 200);

    if (e.deltaY > 10) setIndex((i) => (i + 1) % slides.length);
    else if (e.deltaY < -10) setIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  const cardData = (i) => {
    // For now show same data on all three cards (can be customized per slide)
    return {
      total: portfolio?.total_value ?? 0,
      balance: portfolio?.balance ?? 0,
      change24: portfolio?.change_24h ?? 0,
      positions: portfolio?.positions?.length ?? 0,
    };
  };

  return (
    <div
      className="mobile-portfolio-carousel"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      <div className="carousel-inner" style={{ transform: `translateY(-${index * slideHeight}px)` }}>
        {slides.map((s, i) => {
          const data = cardData(i);
          const offset = i - index;
          const translateY = Math.abs(offset) * 4; /* subtle vertical offset for stacking effect */
          const shadowOpacity = Math.max(0.04, 0.12 - Math.abs(offset) * 0.03); /* deeper shadow for front cards */
          const zIndex = 300 - Math.abs(offset) * 5;
          
          // Card 1: Balance with 24h change
          if (i === 0) {
            const isPositive = data.change24 >= 0;
            return (
              <div
                key={i}
                className={`mobile-portfolio-card carousel-card card-balance ${i === index ? 'active' : ''}`}
                style={{ transform: `translateY(${translateY}px)`, zIndex, boxShadow: `0 ${4 + Math.abs(offset) * 2}px ${12 + Math.abs(offset) * 4}px rgba(0, 0, 0, ${shadowOpacity})` }}
              >
                <div className="card-content card-balance-content">
                  <div className="balance-section">
                    <div className="balance-label">Account Balance</div>
                    <div className="balance-large">${data.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="change-section">
                    <div className={`change-badge ${isPositive ? 'positive' : 'negative'}`}>
                      <span className="change-arrow">{isPositive ? '↑' : '↓'}</span>
                      <span className="change-value">{Math.abs(data.change24)}%</span>
                    </div>
                    <div className="change-label">24h Change</div>
                  </div>
                </div>
              </div>
            );
          }
          
          // Card 2: Portfolio Value and Positions with enhanced layout
          if (i === 1) {
            return (
              <div
                key={i}
                className={`mobile-portfolio-card carousel-card card-portfolio ${i === index ? 'active' : ''}`}
                style={{ transform: `translateY(${translateY}px)`, zIndex, boxShadow: `0 ${4 + Math.abs(offset) * 2}px ${12 + Math.abs(offset) * 4}px rgba(0, 0, 0, ${shadowOpacity})` }}
              >
                <div className="card-content card-portfolio-content">
                  <div className="portfolio-stat portfolio-main">
                    <div className="portfolio-icon"><PortfolioIcon /></div>
                    <div className="portfolio-label">Total Value</div>
                    <div className="portfolio-value">${data.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="portfolio-divider"></div>
                  <div className="portfolio-stat portfolio-secondary">
                    <div className="portfolio-icon"><ChartIcon /></div>
                    <div className="portfolio-label">Active Positions</div>
                    <div className="portfolio-value">{data.positions}</div>
                  </div>
                </div>
              </div>
            );
          }
          
          // Card 3: Holdings Distribution with SVG Pie Chart
          if (i === 2) {
            return (
              <div
                key={i}
                className={`mobile-portfolio-card carousel-card card-chart ${i === index ? 'active' : ''}`}
                style={{ transform: `translateY(${translateY}px)`, zIndex, boxShadow: `0 ${4 + Math.abs(offset) * 2}px ${12 + Math.abs(offset) * 4}px rgba(0, 0, 0, ${shadowOpacity})` }}
              >
                <div className="card-content card-chart-content">
                  <PieChart positions={portfolio?.positions || []} />
                </div>
              </div>
            );
          }
        })}
      </div>

      <div className="carousel-dots">
        {slides.map((_, i) => (
          <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>
    </div>
  );
};

export default MobilePortfolioCarousel;
