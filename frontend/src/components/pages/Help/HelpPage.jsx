import React from 'react';
import './HelpPage.css';
import Icon from '../../icons/Icon';

export const HelpPage = () => {
  const [expandedFaq, setExpandedFaq] = React.useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I create an account?',
      answer: 'Click on the Sign Up button on the landing page, fill in your email and password, and verify your email address. Your account will be ready to use immediately.'
    },
    {
      id: 2,
      question: 'How do I deposit funds?',
      answer: 'Go to the Transactions page, click "Add Funds", and select your preferred payment method. Follow the on-screen instructions to complete your deposit.'
    },
    {
      id: 3,
      question: 'What are the withdrawal limits?',
      answer: 'Minimum withdrawal is $10 and maximum is $50,000 per transaction. Daily withdrawal limit is $100,000. Withdrawals are processed within 1-3 business days.'
    },
    {
      id: 4,
      question: 'How do I enable two-factor authentication?',
      answer: 'Go to Settings > Security and click "Enable 2FA". Scan the QR code with your authenticator app and enter the code to confirm. This adds an extra layer of security to your account.'
    },
    {
      id: 5,
      question: 'How do I view my trading history?',
      answer: 'Go to the Transactions page and select the "Trades" tab. You can see all your trading history with details like date, asset, amount, and price.'
    },
    {
      id: 6,
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email, and check your inbox for a reset link. Follow the link to create a new password.'
    },
    {
      id: 7,
      question: 'How do I generate API keys?',
      answer: 'Go to Settings > API Keys and click "Generate New Key". Save your key in a secure location - you won\'t be able to view it again. Use it to access our API programmatically.'
    },
    {
      id: 8,
      question: 'What payment methods are accepted?',
      answer: 'We accept credit/debit cards, bank transfers, and PayPal. All payments are processed securely with SSL encryption.'
    }
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="help-page">
      <h1>Help & Support</h1>
      <p className="intro">Find answers to common questions and get support</p>

      <div className="help-sections">
        {/* Quick Links */}
        <section className="help-section">
          <h2>Quick Links</h2>
          <div className="quick-links">
            <a href="mailto:support@elon-u.com" className="quick-link">
              <Icon name="link" className="icon-inline" />
              <span className="text">Contact Support</span>
            </a>
            <a href="#" className="quick-link">
              <Icon name="dashboard" className="icon-inline" />
              <span className="text">Live Chat</span>
            </a>
            <a href="#" className="quick-link">
              <Icon name="copy" className="icon-inline" />
              <span className="text">Documentation</span>
            </a>
            <a href="#" className="quick-link">
              <Icon name="dashboard" className="icon-inline" />
              <span className="text">Report a Bug</span>
            </a>
          </div>
        </section>

        {/* FAQs */}
        <section className="help-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map((faq) => (
              <div key={faq.id} className="faq-item">
                <button
                  className="faq-question"
                  onClick={() => toggleFaq(faq.id)}
                >
                  <span className="question-text">{faq.question}</span>
                  <span className={`toggle-icon ${expandedFaq === faq.id ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedFaq === faq.id && (
                  <div className="faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Support Info */}
        <section className="help-section">
          <h2>Need More Help?</h2>
          <div className="support-info">
            <div className="support-item">
              <h3>Email Support</h3>
              <p>support@elon-u.com</p>
              <p className="muted">Response time: 24 hours</p>
            </div>
            <div className="support-item">
              <h3>Live Chat</h3>
              <p>Available Mon-Fri, 9 AM - 6 PM EST</p>
              <p className="muted">Average response time: 2 minutes</p>
            </div>
            <div className="support-item">
              <h3>API Documentation</h3>
              <p>View our comprehensive API docs</p>
              <p className="muted">Complete code examples and guides</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
