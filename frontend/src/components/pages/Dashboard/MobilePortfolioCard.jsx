import React from 'react';
import './MobilePortfolioCard.css';

const MobilePortfolioCard = ({ portfolio }) => {
  // Handle null or undefined portfolio
  if (!portfolio) {
    return null;
  }

  const portfolioValue = portfolio?.total_value || 0;
  const balance = portfolio?.balance || 0;
  const change24h = portfolio?.change_24h || 0;
  const positions = portfolio?.positions?.length || 0;

  return (
    <div className="mobile-portfolio-card">
      <svg
        className="portfolio-bg-animation"
        viewBox="0 0 320 200"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Animated chart lines */}
        <defs>
          <style>{`
            @keyframes flowChart {
              0%, 100% { stroke-dashoffset: 1000; }
              50% { stroke-dashoffset: 0; }
            }
            .chart-line {
              stroke: url(#gradientChart);
              stroke-width: 2;
              fill: none;
              stroke-dasharray: 1000;
              animation: flowChart 3.5s ease-in-out infinite;
            }
            .chart-line:nth-of-type(1) { opacity: 0.95; }
            .chart-line:nth-of-type(2) { opacity: 0.6; animation-delay: 0.2s; }
            .chart-line:nth-of-type(3) { opacity: 0.35; animation-delay: 0.5s; }
          `}</style>
          <linearGradient id="gradientChart" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.8)" />
            <stop offset="100%" stopColor="rgba(252, 211, 77, 0.3)" />
          </linearGradient>
        </defs>

        {/* Chart lines - simulating price movements */}
        <polyline
          className="chart-line"
          points="10,150 50,120 90,130 130,80 170,100 210,50 250,70 290,30"
        />
        <polyline
          className="chart-line"
          points="10,160 50,140 90,150 130,100 170,120 210,70 250,90 290,50"
        />
        <polyline
          className="chart-line"
          points="10,140 50,100 90,110 130,60 170,80 210,30 250,50 290,10"
        />
      </svg>

      {/* Stats grid overlay */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(248, 250, 252, 0.7)',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            Portfolio Value
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--accent)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ${portfolioValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(248, 250, 252, 0.7)',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            Balance
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--accent-light)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            ${balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(248, 250, 252, 0.7)',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            24h Change
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: change24h >= 0 ? '#4ade80' : '#ef4444',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
          </div>
        </div>

        <div style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(248, 250, 252, 0.7)',
            marginBottom: '4px',
            fontWeight: '500'
          }}>
            Positions
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--accent)',
            fontVariantNumeric: 'tabular-nums'
          }}>
            {positions}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePortfolioCard;
