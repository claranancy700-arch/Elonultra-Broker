import React, { useRef, useState, useEffect } from 'react';
import './MobilePortfolioCarousel.css';

// Small SVG icons (no external deps)
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="1" y="5" width="22" height="14" rx="2" />
    <path d="M1 11h22" />
  </svg>
);

const CompositionDonutChart = ({ positions = [] }) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setAnimateIn(true), 20);
    return () => clearTimeout(id);
  }, [positions]);

  const cleaned = (positions || [])
    .map((p) => ({
      coin: p?.coin || 'Unknown',
      value: Number(p?.value ?? ((p?.amount || 0) * (p?.price || 0))) || 0,
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!cleaned.length) {
    return <div className="composition-empty">No holdings</div>;
  }

  const total = cleaned.reduce((sum, item) => sum + item.value, 0) || 1;
  const top4 = cleaned.slice(0, 4);
  const otherValue = cleaned.slice(4).reduce((sum, item) => sum + item.value, 0);

  const segmentsRaw = top4.map((item) => ({
    coin: item.coin,
    pct: (item.value / total) * 100,
  }));

  const segments = otherValue > 0
    ? [...segmentsRaw, { coin: 'Other', pct: (otherValue / total) * 100 }]
    : segmentsRaw;

  const colors = ['#f59e0b', '#22c55e', '#0ea5e9', '#f97316', '#94a3b8'];
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const top = segments[0];

  let runningOffset = 0;
  const ringSegments = segments.map((segment, index) => {
    const segmentLength = Math.max((segment.pct / 100) * circumference - 2, 0);
    const output = {
      ...segment,
      color: colors[index % colors.length],
      dasharray: `${animateIn ? segmentLength : 0} ${circumference}`,
      dashoffset: -runningOffset,
    };
    runningOffset += (segment.pct / 100) * circumference;
    return output;
  });

  return (
    <div className="composition-chart" role="img" aria-label="Portfolio composition donut chart">
      <div className="composition-ring-wrap">
        <svg viewBox="0 0 92 92" className="composition-ring-svg" aria-hidden="true">
          <circle cx="46" cy="46" r={radius} className="composition-ring-track" />
          {ringSegments.map((segment, index) => (
            <circle
              key={`${segment.coin}-${index}`}
              cx="46"
              cy="46"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={segment.dasharray}
              strokeDashoffset={segment.dashoffset}
              transform="rotate(-90 46 46)"
              className="composition-ring-segment"
              style={{ transitionDelay: `${index * 90}ms` }}
            />
          ))}
        </svg>

        <div className="composition-center">
          <span className="composition-center-coin">{top.coin}</span>
          <span className="composition-center-pct">{top.pct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="composition-legend">
        {ringSegments.map((segment) => (
          <div className="composition-legend-item" key={`legend-${segment.coin}`}>
            <span className="composition-dot" style={{ backgroundColor: segment.color }} />
            <span className="composition-coin">{segment.coin}</span>
            <span className="composition-pct">{segment.pct.toFixed(0)}%</span>
          </div>
        ))}
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

  // Non-passive touchmove is attached via useEffect so e.preventDefault() works on iOS
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e) => {
      if (startX.current == null) return;
      deltaX.current = e.touches[0].clientX - startX.current;
      if (Math.abs(deltaX.current) > 10) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

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
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      {/* Single Card with Changing Content */}
      <div className="carousel-card single-card">
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
          <div key={index} style={{ width: '100%', height: '100%', animation: 'fadeIn 200ms ease-out' }}>
          {index === 0 ? (
            <div className="card-balance-modern">
              <div className="balance-header">
                <div className="card-title balance-label">Available Balance</div>
                <div className="balance-icon"><WalletIcon /></div>
              </div>
              <div className="balance-amount metallic">${data.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              <div className={`change-badge metallic ${data.change24 >= 0 ? 'positive' : 'negative'}`} style={{ marginTop: 12 }}>
                <span className="change-arrow">{data.change24 >= 0 ? '▲' : '▼'}</span>
                <span className="change-text">{data.change24 >= 0 ? '+' : ''}{data.change24.toFixed(2)}%</span>
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
                <CompositionDonutChart positions={portfolio?.positions || []} />
              </div>
            </div>
          )}
          </div>
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
