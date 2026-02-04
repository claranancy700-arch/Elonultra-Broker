import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './LandingPage.css';

export const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [testimonies, setTestimonies] = useState([]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Fetch testimonies if needed (optional)
  useEffect(() => {
    // You can fetch testimonies from an API endpoint if desired
    // For now, just show placeholder testimonies
    setTestimonies([
      { id: 1, name: 'John D.', message: 'Best trading platform I\'ve used. Fast and reliable!', rating: 5 },
      { id: 2, name: 'Sarah M.', message: 'Great features and excellent customer support.', rating: 5 },
      { id: 3, name: 'Mike R.', message: 'Easy to use interface. I\'m making great trades!', rating: 5 },
    ]);
  }, []);

  return (
    <div className="landing-page">
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand">
            <span style={{ display: 'block' }}>ELON ULTRA ELONS</span>
          </Link>
          <nav className="nav">
            <Link to="/">Home</Link>
            <a href="#features">Features</a>
            <a href="#testimonies">Testimonies</a>
            <Link to="/login" className="btn" style={{ marginLeft: 'auto' }}>
              Login
            </Link>
          </nav>
        </div>
      </header>

      <main className="hero">
        <section className="hero-section">
          <h1>ELON ULTRA ELONS Trading Platform</h1>
          <p>Fast, secure, and user-friendly crypto trading platform. Start with as little as $100.</p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Login
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <h3>📊 Real-Time Data</h3>
              <p>Live market data, price charts, and trading volume for hundreds of cryptocurrencies.</p>
            </div>
            <div className="feature-card">
              <h3>🔒 Secure</h3>
              <p>Cold storage, 2FA, and industry-leading security practices keep your assets safe.</p>
            </div>
            <div className="feature-card">
              <h3>⚡ Fast Trading</h3>
              <p>Execute orders in milliseconds with our optimized trading infrastructure.</p>
            </div>
            <div className="feature-card">
              <h3>💰 Low Fees</h3>
              <p>Trade at 0.1% per transaction. VIP members get rates as low as 0.05%.</p>
            </div>
            <div className="feature-card">
              <h3>📱 Mobile Ready</h3>
              <p>Trade on the go with our responsive design and dedicated mobile app.</p>
            </div>
            <div className="feature-card">
              <h3>🔗 REST API</h3>
              <p>Build trading bots and integrate with your own systems using our API.</p>
            </div>
          </div>
        </section>

        {/* Testimonies Section */}
        <section id="testimonies" className="testimonies-section">
          <h2>What Our Clients Say</h2>
          <div className="testimonies-grid">
            {testimonies.map((t) => (
              <div key={t.id} className="testimony-card">
                <div className="stars">{'⭐'.repeat(t.rating)}</div>
                <p className="message">{t.message}</p>
                <p className="name">— {t.name}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          &copy; 2025 ELON ULTRA ELONS — Professional Crypto Trading
        </div>
      </footer>
    </div>
  );
};
