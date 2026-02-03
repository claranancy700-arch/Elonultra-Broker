import React, { useState, useEffect } from 'react';
import './TestimoniesPage.css';
import API from '../../../services/api';

export const TestimoniesPage = () => {
  const [testimonies, setTestimonies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTestimonies();
  }, []);

  const fetchTestimonies = async () => {
    try {
      setLoading(true);
      const response = await API.get('/testimonies');
      setTestimonies(response.data || []);
    } catch (err) {
      console.error('Failed to fetch testimonies:', err);
      // Set some default testimonies if fetch fails
      setTestimonies([
        {
          id: 1,
          name: 'John D.',
          role: 'Day Trader',
          message: 'Best trading platform I\'ve used. Fast execution, great tools, and excellent support!',
          rating: 5,
          avatar: '👨‍💼'
        },
        {
          id: 2,
          name: 'Sarah M.',
          role: 'Portfolio Manager',
          message: 'The low fees and advanced charting tools make this platform a game-changer for professional traders.',
          rating: 5,
          avatar: '👩‍💼'
        },
        {
          id: 3,
          name: 'Mike R.',
          role: 'Crypto Investor',
          message: 'Easy interface, reliable platform, and responsive customer support. Highly recommended!',
          rating: 5,
          avatar: '👨‍💻'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTestimonies = filter === 'all' 
    ? testimonies 
    : testimonies.filter(t => t.rating === parseInt(filter));

  const StarRating = ({ rating }) => (
    <div className="star-rating">
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < rating ? 'star filled' : 'star'}>★</span>
      ))}
    </div>
  );

  return (
    <div className="testimonies-page">
      <section className="testimonies-hero">
        <div className="container">
          <h1>What Our Traders Say</h1>
          <p className="subtitle">Real experiences from real traders using ELON ULTRA ELONS</p>
        </div>
      </section>

      <section className="testimonies-content">
        <div className="container">
          <div className="testimonies-header">
            <h2>Customer Testimonies</h2>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All Reviews ({testimonies.length})
              </button>
              <button 
                className={`filter-btn ${filter === '5' ? 'active' : ''}`}
                onClick={() => setFilter('5')}
              >
                ⭐⭐⭐⭐⭐ ({testimonies.filter(t => t.rating === 5).length})
              </button>
              <button 
                className={`filter-btn ${filter === '4' ? 'active' : ''}`}
                onClick={() => setFilter('4')}
              >
                ⭐⭐⭐⭐ ({testimonies.filter(t => t.rating === 4).length})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading testimonies...</div>
          ) : filteredTestimonies.length > 0 ? (
            <div className="testimonies-grid">
              {filteredTestimonies.map(testimony => (
                <div key={testimony.id} className="testimony-card">
                  <div className="testimony-header">
                    <div className="avatar">{testimony.avatar || '👤'}</div>
                    <div className="user-info">
                      <h3>{testimony.name}</h3>
                      <p className="role">{testimony.role || 'Trader'}</p>
                    </div>
                  </div>
                  <StarRating rating={testimony.rating || 5} />
                  <p className="message">"{testimony.message}"</p>
                  <p className="date">{testimony.created_at ? new Date(testimony.created_at).toLocaleDateString() : 'Recently'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-testimonies">
              <p>No testimonies found for this filter.</p>
            </div>
          )}
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Start Trading?</h2>
          <p>Join thousands of traders who trust ELON ULTRA ELONS</p>
          <div className="cta-buttons">
            <a href="/login" className="btn btn-primary">Create Account</a>
            <a href="/dashboard" className="btn btn-secondary">Go to Dashboard</a>
          </div>
        </div>
      </section>
    </div>
  );
};
