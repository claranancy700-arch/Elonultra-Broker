import React, { useState } from 'react';
import './DepositPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import API from '../../../services/api';

export const DepositPage = () => {
  const [selectedMethod, setSelectedMethod] = useState('bank');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const depositMethods = {
    bank: {
      name: 'Bank Transfer',
      icon: '🏦',
      fee: '0%',
      time: '1-3 days',
      min: 10,
      max: 50000,
      description: 'Safe and reliable bank transfer'
    },
    card: {
      name: 'Credit/Debit Card',
      icon: '💳',
      fee: '2.5%',
      time: 'Instant',
      min: 10,
      max: 10000,
      description: 'Quick deposit with your card'
    },
    crypto: {
      name: 'Cryptocurrency',
      icon: '₿',
      fee: '0%',
      time: 'Instant',
      min: 0.001,
      max: 'Unlimited',
      description: 'Direct crypto transfer to your wallet'
    },
    paypal: {
      name: 'PayPal',
      icon: '🅿️',
      fee: '1.5%',
      time: 'Instant',
      min: 10,
      max: 25000,
      description: 'Deposit via PayPal account'
    }
  };

  const method = depositMethods[selectedMethod];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await API.post('/deposits', {
        amount: parseFloat(amount),
        method: selectedMethod
      });

      if (response.data?.success) {
        setSuccess(`Deposit initiated! You will receive further instructions shortly.`);
        setAmount('');
      } else {
        setError('Failed to initiate deposit. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deposit-page">
      <div className="container">
        <h1>Add Funds to Your Account</h1>
        <p className="subtitle">Choose your preferred payment method and deposit funds</p>

        <div className="deposit-grid">
          {/* Payment Methods */}
          <section className="payment-methods">
            <h2>Select Payment Method</h2>
            <div className="methods-list">
              {Object.entries(depositMethods).map(([key, method]) => (
                <div
                  key={key}
                  className={`method-card ${selectedMethod === key ? 'active' : ''}`}
                  onClick={() => setSelectedMethod(key)}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={key}
                    checked={selectedMethod === key}
                    onChange={() => setSelectedMethod(key)}
                  />
                  <div className="method-content">
                    <div className="method-header">
                      <span className="icon">{method.icon}</span>
                      <h3>{method.name}</h3>
                    </div>
                    <p className="description">{method.description}</p>
                    <div className="method-details">
                      <span>Fee: {method.fee}</span>
                      <span>Time: {method.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Deposit Form */}
          <section className="deposit-form-section">
            <div className="form-card">
              <h2>Deposit Amount</h2>

              {success && <div className="alert success">{success}</div>}
              {error && <div className="alert error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="amount">Amount (USD) *</label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100.00"
                    step="0.01"
                    min={method.min}
                    max={method.max !== 'Unlimited' ? method.max : undefined}
                    required
                  />
                  <small>
                    Min: ${method.min}, Max: {typeof method.max === 'number' ? '$' + method.max : method.max}
                  </small>
                </div>

                {/* Fee Calculation */}
                {amount && (
                  <div className="fee-breakdown">
                    <div className="fee-row">
                      <span>Amount</span>
                      <span>${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    {method.fee !== '0%' && (
                      <div className="fee-row">
                        <span>Fee ({method.fee})</span>
                        <span>${(parseFloat(amount) * (parseFloat(method.fee) / 100)).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="fee-row total">
                      <span>You will receive</span>
                      <span>${(parseFloat(amount) + (parseFloat(amount) * (parseFloat(method.fee) / 100))).toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading || !amount} className="btn btn-primary btn-block">
                  {loading ? 'Processing...' : `Deposit via ${method.name}`}
                </button>

                <p className="security-note">
                  🔒 Your transaction is encrypted and secure. We never store your payment details.
                </p>
              </form>
            </div>

            {/* Additional Info */}
            <div className="info-card">
              <h3>📋 {selectedMethod === 'crypto' ? 'Deposit Address' : 'Next Steps'}</h3>
              {selectedMethod === 'crypto' ? (
                <div className="crypto-info">
                  <p>Send your crypto to:</p>
                  <div className="address-box">
                    <code>0x742d35Cc6634C0532925a3b844Bc924e56fAb34d</code>
                  </div>
                  <p className="info-text">Minimum deposit: 0.001 BTC or equivalent</p>
                </div>
              ) : (
                <div className="steps-info">
                  <ol>
                    <li>Enter your deposit amount above</li>
                    <li>Click "Deposit" to proceed</li>
                    <li>Follow the payment gateway instructions</li>
                    <li>Funds will appear in your account instantly or within the stated time</li>
                  </ol>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* FAQ */}
        <section className="deposit-faq">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>How long does a deposit take?</h4>
              <p>Deposits via card and crypto are instant. Bank transfers typically take 1-3 business days.</p>
            </div>
            <div className="faq-item">
              <h4>Are there any hidden fees?</h4>
              <p>No, all fees are shown upfront before you confirm your deposit. Transparency is our commitment.</p>
            </div>
            <div className="faq-item">
              <h4>What's the minimum deposit?</h4>
              <p>The minimum deposit is $10 (or equivalent in crypto). This varies by payment method.</p>
            </div>
            <div className="faq-item">
              <h4>Is my payment information secure?</h4>
              <p>Yes! We use SSL encryption and PCI compliance. We never store your payment card details.</p>
            </div>
            <div className="faq-item">
              <h4>Can I deposit in other currencies?</h4>
              <p>Yes, we support deposits in USD, EUR, GBP, and other major currencies.</p>
            </div>
            <div className="faq-item">
              <h4>What if my deposit fails?</h4>
              <p>Contact our support team and we'll help resolve the issue within 24 hours.</p>
            </div>
          </div>
        </section>
      </div>

      <MobileBottomNav />
    </div>
  );
};
