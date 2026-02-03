import React, { useState } from 'react';
import './ContactPage.css';
import API from '../../../services/api';

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await API.post('/contact', formData);
      if (response.data?.success) {
        setSuccess('Message sent successfully! We\'ll respond within 24 hours.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="container">
          <h1>Contact Us</h1>
          <p className="subtitle">We're here to help. Get in touch with our support team.</p>
        </div>
      </section>

      <section className="contact-content">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Info */}
            <div className="contact-info">
              <h2>Get In Touch</h2>
              <p>Have questions? Our support team is available 24/7 to assist you.</p>

              <div className="info-cards">
                <div className="info-card">
                  <h3>📧 Email</h3>
                  <p><a href="mailto:support@elonultraelons.com">support@elonultraelons.com</a></p>
                </div>
                <div className="info-card">
                  <h3>💬 Live Chat</h3>
                  <p>Available in app during trading hours</p>
                </div>
                <div className="info-card">
                  <h3>🕐 Response Time</h3>
                  <p>Usually within 1 hour</p>
                </div>
                <div className="info-card">
                  <h3>🌍 Availability</h3>
                  <p>24/7 support in multiple languages</p>
                </div>
              </div>

              <div className="faq-section">
                <h3>Quick Links</h3>
                <ul>
                  <li><a href="/help">Help & Documentation</a></li>
                  <li><a href="/about">About Us</a></li>
                  <li><a href="#faq">Frequently Asked Questions</a></li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <h2>Send us a Message</h2>
              <form onSubmit={handleSubmit} className="contact-form">
                {success && <div className="alert success">{success}</div>}
                {error && <div className="alert error">{error}</div>}

                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="What is this about?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Please describe your issue or question in detail..."
                    rows="6"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
