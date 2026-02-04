import React from 'react';
import './AboutPage.css';
import Icon from '../../icons/Icon';

export const AboutPage = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <h1>About ELON ULTRA ELONS</h1>
          <p className="subtitle">Empowering traders with cutting-edge technology and financial tools</p>
        </div>
      </section>

      <section className="about-content">
        <div className="container">
          <div className="about-section">
            <h2>Our Mission</h2>
            <p>
              At ELON ULTRA ELONS, we believe that everyone should have access to professional-grade 
              cryptocurrency trading tools. Our platform combines advanced technology with user-friendly 
              interfaces to make digital asset trading accessible to traders of all experience levels.
            </p>
          </div>

          <div className="about-section">
            <h2>What We Offer</h2>
            <div className="features-grid">
              <div className="feature">
                <h3><Icon name="chart" className="icon-inline" /> Real-Time Market Data</h3>
                <p>Access live price feeds, charts, and trading volumes for hundreds of cryptocurrencies with minimal latency.</p>
              </div>
              <div className="feature">
                <h3><Icon name="lock" className="icon-inline" /> Enterprise Security</h3>
                <p>Your assets are protected with cold storage, 2FA, multi-signature wallets, and regular security audits.</p>
              </div>
              <div className="feature">
                <h3>Fast Execution</h3>
                <p>Execute trades in milliseconds with our optimized infrastructure and global server network.</p>
              </div>
              <div className="feature">
                <h3><Icon name="chart" className="icon-inline" /> Advanced Tools</h3>
                <p>Technical analysis tools, portfolio management, risk management features, and trading algorithms.</p>
              </div>
              <div className="feature">
                <h3><Icon name="money" className="icon-inline" /> Low Fees</h3>
                <p>Transparent pricing starting at 0.1% per transaction. VIP members enjoy rates as low as 0.05%.</p>
              </div>
              <div className="feature">
                <h3>Global Access</h3>
                <p>Trade 24/7 from anywhere in the world. Multi-currency support and local payment methods.</p>
              </div>
            </div>
          </div>

          <div className="about-section">
            <h2>Our Story</h2>
            <p>
              Founded in 2024, ELON ULTRA ELONS was created by a team of cryptocurrency enthusiasts and 
              fintech experts. We saw the need for a platform that combines powerful tools with exceptional 
              customer service. Today, we serve thousands of traders worldwide and continue to innovate every day.
            </p>
          </div>

          <div className="about-section">
            <h2>Why Choose Us?</h2>
            <ul className="benefits-list">
              <li>✔ Licensed and regulated in multiple jurisdictions</li>
              <li>✔ $100M+ insurance coverage on user funds</li>
              <li>✔ 24/7 customer support in multiple languages</li>
              <li>✔ Zero hidden fees - complete transparency</li>
              <li>✔ Regular platform updates and new features</li>
              <li>✔ Active community with 50,000+ traders</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="about-stats">
        <div className="container">
          <h2>By The Numbers</h2>
          <div className="stats-grid">
            <div className="stat">
              <h3>$2.5B+</h3>
              <p>Total Trading Volume</p>
            </div>
            <div className="stat">
              <h3>50K+</h3>
              <p>Active Traders</p>
            </div>
            <div className="stat">
              <h3>150+</h3>
              <p>Supported Assets</p>
            </div>
            <div className="stat">
              <h3>99.9%</h3>
              <p>Uptime Guarantee</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
