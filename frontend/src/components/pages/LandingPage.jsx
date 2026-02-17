import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LandingPageHeader } from '../layout/LandingPageHeader';
import ThemeFab from '../layout/ThemeFab';
import './LandingPage.css';
import Icon from '../icons/Icon';

export const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [testimonies, setTestimonies] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [openFAQ, setOpenFAQ] = useState(null);
  const [stats, setStats] = useState({ traders: 0, volume: 0, transactions: 0 });

  // Track mouse position for parallax
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animated counter for stats
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        traders: prev.traders < 100000 ? prev.traders + Math.random() * 500 : 100000,
        volume: prev.volume < 2000000000 ? prev.volume + Math.random() * 5000000 : 2000000000,
        transactions: prev.transactions < 50000000 ? prev.transactions + Math.random() * 100000 : 50000000,
      }));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Fetch testimonies
  useEffect(() => {
    setTestimonies([
      { id: 1, name: 'John D.', title: 'Professional Trader', message: 'Best trading platform I\'ve used. Fast and reliable!', rating: 5 },
      { id: 2, name: 'Sarah M.', title: 'Crypto Investor', message: 'Great features and excellent customer support.', rating: 5 },
      { id: 3, name: 'Mike R.', title: 'Day Trader', message: 'Easy to use interface. I\'m making great trades!', rating: 5 },
    ]);
  }, []);

  const faqItems = [
    { id: 1, q: 'How secure is my account?', a: 'We use military-grade encryption, cold storage, and 2FA authentication to keep your account safe.' },
    { id: 2, q: 'What are the trading fees?', a: 'We charge 0.1% per transaction. VIP members get rates as low as 0.05%. No hidden fees.' },
    { id: 3, q: 'Can I trade 24/7?', a: 'Yes! Our platform is available 24/7 for crypto trading with no market restrictions.' },
    { id: 4, q: 'What is the minimum deposit?', a: 'You can start trading with as little as $100. We support multiple payment methods.' },
    { id: 5, q: 'Do you have a mobile app?', a: 'Yes, our mobile app is available on both iOS and Android with all desktop features.' },
  ];

  return (
    <div className="landing-page" style={{ '--mouse-x': `${mousePosition.x}px`, '--mouse-y': `${mousePosition.y}px` }}>
      {/* Animated background */}
      <div className="bg-gradient"></div>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* LANDING PAGE HEADER */}
      <LandingPageHeader />

      <main className="landing-content">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-background">
            <div className="grid-bg"></div>
          </div>

          <div className="hero-container">
            <div className="hero-left scroll-animate">
              <div className="hero-badge">✨ Next-Gen Trading Platform</div>
              <h1 className="hero-title">
                Trade Smarter,<br />Not Harder
              </h1>
              <p className="hero-desc">
                Experience lightning-fast execution, advanced analytics, and industry-leading security. Join 100K+ successful traders earning consistent profits.
              </p>
              <div className="hero-buttons">
                <Link to="/login" className="btn btn-primary">
                  Login
                </Link>
                <Link to="/signup" className="btn btn-outline">
                  Get Started
                </Link>
              </div>
              <div className="hero-trust">
                <p>✓ No credit card required • ✓ 100% Secure • ✓ Free Forever</p>
              </div>
            </div>

            <div className="hero-right scroll-animate">
              <div className="hero-showcase">
                <div className="floating-box box-1" style={{ '--delay': '0s' }}>
                  <div className="box-content">
                    <span className="box-icon"><Icon name="trending-up" size={24} /></span>
                    <span className="box-value">+24.5%</span>
                    <span className="box-label">Today's Gain</span>
                  </div>
                </div>
                <div className="floating-box box-2" style={{ '--delay': '0.5s' }}>
                  <div className="box-content">
                    <span className="box-icon"><Icon name="dollar-sign" size={24} /></span>
                    <span className="box-value">$2.4K</span>
                    <span className="box-label">Portfolio</span>
                  </div>
                </div>
                <div className="floating-box box-3" style={{ '--delay': '1s' }}>
                  <div className="box-content">
                    <span className="box-icon"><Icon name="lock" size={24} /></span>
                    <span className="box-value">Secured</span>
                    <span className="box-label">Cold Storage</span>
                  </div>
                </div>
                <div className="animated-chart">
                  <svg viewBox="0 0 400 200" className="chart-svg">
                    <polyline points="0,180 50,160 100,140 150,120 200,80 250,100 300,60 350,45 400,30" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="stats-section scroll-animate">
          <div className="stat-card">
            <h3>{Math.round(stats.traders / 1000)}K+</h3>
            <p>Active Traders</p>
          </div>
          <div className="stat-card">
            <h3>${Math.round(stats.volume / 1000000)}B+</h3>
            <p>Volume Traded</p>
          </div>
          <div className="stat-card">
            <h3>{Math.round(stats.transactions / 1000000)}M+</h3>
            <p>Transactions</p>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="features-section">
          <div className="section-header scroll-animate">
            <div className="section-logo"><Icon name="zap" size={40} /></div>
            <h2>Powerful Trading Tools</h2>
            <p>Everything you need for professional crypto trading</p>
          </div>

          <div className="features-grid">
            {[
              { icon: 'bar-chart-2', title: 'Real-Time Analytics', desc: 'Advanced charts with 50+ indicators' },
              { icon: 'zap', title: 'Lightning Fast', desc: 'Execute orders in milliseconds' },
              { icon: 'shield', title: 'Maximum Security', desc: 'Military-grade encryption' },
              { icon: 'dollar-sign', title: 'Ultra Low Fees', desc: '0.1% per transaction' },
              { icon: 'smartphone', title: 'Mobile Ready', desc: 'Trade anywhere, anytime' },
              { icon: 'code', title: 'REST API', desc: 'Build your own trading bots' },
            ].map((feature, i) => (
              <div key={i} className="feature-card scroll-animate" style={{ '--delay': `${i * 0.1}s` }}>
                <div className="feature-icon"><Icon name={feature.icon} size={36} /></div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES HIGHLIGHT SECTION */}
        <section className="highlight-section scroll-animate">
          <div className="highlight-content">
            <div className="highlight-text">
              <h2>Professional-Grade Trading Engine</h2>
              <p>Built for speed, security, and simplicity. Our proprietary matching engine processes thousands of orders per second.</p>
              <ul className="highlight-list">
                <li>Sub-millisecond order execution</li>
                <li>Advanced order types & strategies</li>
                <li>Real-time market data</li>
                <li>Risk management tools</li>
              </ul>
              <Link to="/signup" className="btn btn-primary">Learn More</Link>
            </div>
            <div className="highlight-visual">
              <div className="card-showcase">
                <div className="showcase-item item-1"></div>
                <div className="showcase-item item-2"></div>
                <div className="showcase-item item-3"></div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIES SECTION */}
        <section id="testimonies" className="testimonies-section">
          <div className="section-header scroll-animate">
            <div className="section-logo"><Icon name="star" size={40} /></div>
            <h2>Trusted by Thousands</h2>
            <p>Real traders, real results</p>
          </div>

          <div className="testimonies-grid">
            {testimonies.map((t, idx) => (
              <div key={t.id} className="testimony-card scroll-animate" style={{ '--delay': `${idx * 0.1}s` }}>
                <div className="stars">{'★'.repeat(t.rating)}</div>
                <p className="message">"{t.message}"</p>
                <div className="testimony-author">
                  <div className="author-avatar">{t.name[0]}</div>
                  <div>
                    <p className="author-name">{t.name}</p>
                    <p className="author-title">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="faq-section">
          <div className="section-header scroll-animate">
            <div className="section-logo"><Icon name="help-circle" size={40} /></div>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know</p>
          </div>

          <div className="faq-grid">
            {faqItems.map((item) => (
              <div key={item.id} className="faq-item scroll-animate" onClick={() => setOpenFAQ(openFAQ === item.id ? null : item.id)}>
                <button className="faq-question">
                  <span>{item.q}</span>
                  <span className={`arrow ${openFAQ === item.id ? 'open' : ''}`}>→</span>
                </button>
                {openFAQ === item.id && <div className="faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* NEWSLETTER SECTION */}
        <section className="newsletter-section scroll-animate">
          <div className="newsletter-content">
            <h2>Stay Updated with Market Insights</h2>
            <p>Get daily trading tips, market analysis, and exclusive offers delivered to your inbox.</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Enter your email..." />
              <button className="btn btn-primary">Subscribe</button>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta scroll-animate">
          <h2>Ready to Transform Your Trading?</h2>
          <p>Join thousands of successful traders. Start free today.</p>
          <Link to="/signup" className="btn btn-primary btn-lg">Create Your Account</Link>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <img src="/dist/images/elon-logo.svg" alt="ELON-ULTRA" style={{ width: '24px', height: '24px' }} />
              <h4 style={{ margin: 0 }}>ELON-ULTRA</h4>
            </div>
            <p>Professional crypto trading platform for everyone.</p>
          </div>
          <div className="footer-col">
            <h4>Quick Links</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="/">Privacy</a>
            <a href="/">Terms</a>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <a href="/">Support</a>
            <a href="/">Email Us</a>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2026 ELON-ULTRA. All rights reserved.
        </div>
      </footer>
      <ThemeFab />
    </div>
  );
};
