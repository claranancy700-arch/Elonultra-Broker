import React, { useState } from 'react';
import './HelpPage.css';

const faqs = [
  {
    id: 1,
    question: 'How do I create an account?',
    answer: 'Click Sign Up on the landing page, fill in your email and password, then verify your email address. Your account will be active immediately.',
  },
  {
    id: 2,
    question: 'How do I deposit funds?',
    answer: 'Go to the Transactions page and click Add Funds. Select your preferred payment method — bank wire, card, or crypto — and follow the on-screen steps.',
  },
  {
    id: 3,
    question: 'What are the withdrawal limits?',
    answer: 'Minimum withdrawal is $10, maximum per transaction is $50,000. Daily limit is $100,000. Withdrawals are processed within 1–3 business days.',
  },
  {
    id: 4,
    question: 'How do I enable two-factor authentication?',
    answer: 'Go to Settings → Security and click Enable 2FA. Scan the QR code with your authenticator app and enter the confirmation code.',
  },
  {
    id: 5,
    question: 'How do I reset my password?',
    answer: 'Click Forgot Password on the login page. Enter your email and check your inbox for a reset link. The link expires after 30 minutes.',
  },
  {
    id: 6,
    question: 'How do I generate API keys?',
    answer: "Go to Settings → API Keys and click Generate New Key. Store it securely — you won't be able to view it again after creation.",
  },
  {
    id: 7,
    question: 'What payment methods are accepted?',
    answer: 'We accept credit/debit cards, bank wire transfers, and crypto transfers. All transactions are processed with SSL encryption.',
  },
  {
    id: 8,
    question: 'How do I view my trade history?',
    answer: 'Go to Transactions and select the Trades tab. All trades are listed with date, asset, quantity, price, and P&L.',
  },
];

const openLiveChat = () => {
  if (typeof window !== 'undefined' && typeof window.openSupportChat === 'function') {
    window.openSupportChat();
  }
};

export const HelpPage = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFaq = (id) => setExpandedFaq(expandedFaq === id ? null : id);

  const displayedFaqs = searchQuery.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  return (
    <div className="help-page">

      {/* ── HEADER ── */}
      <div className="help-header">
        <div className="help-page-label">Resources</div>
        <h1 className="help-page-title">Help &amp; Support</h1>
        <p className="help-page-sub">Find answers, get in touch, or browse guides</p>
      </div>

      {/* ── SEARCH ── */}
      <div className="help-search-wrap">
        <svg className="help-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="help-search"
          type="text"
          placeholder="Search for answers, guides, topics…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="help-quick-grid">
        <a href="mailto:support@elon-u.com" className="help-quick-card">
          <div className="help-quick-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <span className="help-quick-label">Email Support</span>
          <span className="help-quick-sub">support@elon-u.com</span>
        </a>
        <button type="button" className="help-quick-card" onClick={openLiveChat}>
          <div className="help-quick-icon ic-green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <span className="help-quick-label">Live Chat</span>
          <span className="help-quick-sub">Avg. 2 min reply</span>
        </button>
        <a href="#" className="help-quick-card">
          <div className="help-quick-icon ic-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <span className="help-quick-label">Documentation</span>
          <span className="help-quick-sub">API &amp; guides</span>
        </a>
        <a href="#" className="help-quick-card">
          <div className="help-quick-icon ic-warn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <span className="help-quick-label">Report a Bug</span>
          <span className="help-quick-sub">Submit an issue</span>
        </a>
      </div>

      {/* ── FAQ ── */}
      <div className="help-section">
        <div className="help-section-header">
          <div className="help-section-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <span className="help-section-title">Frequently Asked Questions</span>
        </div>
        <div className="faq-list">
          {displayedFaqs.length === 0 && (
            <p className="faq-empty">No results for "{searchQuery}"</p>
          )}
          {displayedFaqs.map((faq) => {
            const isOpen = expandedFaq === faq.id;
            return (
              <div key={faq.id} className="faq-item">
                <button
                  className={`faq-btn${isOpen ? ' open' : ''}`}
                  onClick={() => toggleFaq(faq.id)}
                >
                  <span className="faq-question">{faq.question}</span>
                  <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div className={`faq-answer${isOpen ? ' open' : ''}`}>{faq.answer}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SUPPORT CHANNELS ── */}
      <div className="help-section">
        <div className="help-section-header">
          <div className="help-section-icon ic-green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.92z"/>
            </svg>
          </div>
          <span className="help-section-title">Contact &amp; Support Channels</span>
        </div>
        <div className="support-grid">
          <div className="support-card">
            <div className="support-card-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div className="support-card-title">Email Support</div>
            <div className="support-card-desc">Get a detailed response from our team. Best for account issues and formal requests.</div>
            <div className="support-card-meta">Typically within 24 hours</div>
            <a href="mailto:support@elon-u.com" className="support-card-btn">support@elon-u.com</a>
          </div>
          <div className="support-card">
            <div className="support-card-icon ic-green">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div className="support-card-title">Live Chat</div>
            <div className="support-card-desc">Talk to a real agent instantly. Available Monday – Friday, 9 AM – 6 PM EST.</div>
            <div className="support-card-meta">Avg. response: 2 minutes</div>
            <button type="button" className="support-card-btn btn-green" onClick={openLiveChat}>Start Chat</button>
          </div>
          <div className="support-card">
            <div className="support-card-icon ic-blue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div className="support-card-title">API Documentation</div>
            <div className="support-card-desc">Full reference with code examples, authentication guides, and endpoint specs.</div>
            <div className="support-card-meta">Always up to date</div>
            <a href="#" className="support-card-btn btn-blue">View Docs</a>
          </div>
        </div>
      </div>

    </div>
  );
};

