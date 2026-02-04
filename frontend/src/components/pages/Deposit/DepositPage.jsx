import React, { useState, useEffect } from 'react';
import './DepositPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import API from '../../../services/api';
import Icon from '../../icons/Icon';

const MOCK_ADDRESSES = {
  BTC: 'bc1qmockaddressforbtc00000000000000',
  ETH: '0xMockEthereumAddressForDeposit0000000000000000',
  USDT: 'TMockTetherAddressUSDT000000000000000',
  USDC: '0xMockUSDCCryptoAddress0000000000000000'
};

export const DepositPage = () => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank');
  const [currency, setCurrency] = useState('BTC');
  const [showCryptoSection, setShowCryptoSection] = useState(false);
  const [depositAddress, setDepositAddress] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch address when crypto method is selected or currency changes
  useEffect(() => {
    if (method === 'crypto' && currency) {
      fetchAndShowAddress(currency);
    }
  }, [method, currency]);

  const fetchAndShowAddress = async (sym) => {
    try {
      const symbol = sym.toUpperCase();
      
      // Try API first
      try {
        const res = await API.get(`/deposit/address?currency=${symbol}`);
        if (res.data?.address) {
          setDepositAddress(res.data.address);
          setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(res.data.address)}`);
          return;
        }
      } catch (apiErr) {
        console.warn('Could not fetch from API, using mock address', apiErr.message);
      }

      // Fallback to mock
      const mockAddr = MOCK_ADDRESSES[symbol] || '0xMOCKADDRESS0000000000000000000000000000';
      setDepositAddress(mockAddr);
      setQrCode(`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mockAddr)}`);
    } catch (err) {
      console.error('Address fetch error:', err);
      setDepositAddress('');
      setQrCode('');
    }
  };

  const handleMethodChange = (e) => {
    const newMethod = e.target.value;
    setMethod(newMethod);
    setShowCryptoSection(newMethod === 'crypto');
  };

  const handleBinanceClick = () => {
    const url = new URL('https://www.binance.com/en/buy-sell-crypto');
    if (amount) url.searchParams.set('amount', amount);
    window.open(url.toString(), '_blank', 'noopener');
  };

  const handleCompleteDeposit = async () => {
    setError('');
    setSuccess('');

    const numAmount = parseFloat(amount || 0);
    if (!numAmount || numAmount <= 0) {
      setError('Enter an amount before confirming.');
      return;
    }

    try {
      setLoading(true);
      const res = await API.post('/transactions/deposit', {
        amount: numAmount,
        method: method
      });

      setSuccess('✓ Deposit confirmation received! Redirecting to your transaction history...');
      setAmount('');

      setTimeout(() => {
        window.location.href = '/transactions';
      }, 1500);
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.response?.data?.error || err.message || 'Deposit confirmation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (!depositAddress) return;
    navigator.clipboard?.writeText(depositAddress);
    alert('Address copied to clipboard');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    alert('Please continue on Binance using the button above, then confirm using "I have completed deposit".');
  };

  return (
    <div className="deposit-page">
      <div className="deposit-container">
        {/* Header */}
        <div className="deposit-header">
          <h1><Icon name="money" className="icon-inline" /> Add Funds</h1>
          <p>Deposit funds to your account quickly and securely</p>
        </div>

        {/* Alerts */}
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Main Form */}
        <form onSubmit={handleFormSubmit} className="deposit-form">
          {/* Amount Card */}
          <div className="form-card">
            <label className="form-label">
              <span className="label-text"><Icon name="chart" className="icon-inline" /> Deposit Amount</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                placeholder="100.00"
                required
              />
            </label>
          </div>

          {/* Method Card */}
          <div className="form-card">
            <label className="form-label">
              <span className="label-text"><Icon name="coin" className="icon-inline" /> Payment Method</span>
              <select value={method} onChange={handleMethodChange} required>
                <option value="bank">Bank Transfer</option>
                <option value="card">Credit/Debit Card</option>
                <option value="crypto">Crypto Transfer</option>
              </select>
            </label>
          </div>

          {/* Crypto Section */}
          {showCryptoSection && (
            <div className="form-card">
              <label className="form-label">
                <span className="label-text"><Icon name="coin" className="icon-inline" /> Cryptocurrency</span>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="USDT">Tether (USDT)</option>
                  <option value="USDC">USD Coin (USDC)</option>
                </select>
              </label>
            </div>
          )}

          {/* Address & QR Card */}
          {depositAddress && showCryptoSection && (
            <div className="form-card address-card">
              <div className="qr-section">
                {qrCode && <img src={qrCode} alt="QR Code" className="qr-code" />}
                <p className="qr-label">Scan to send funds</p>
              </div>

              <div className="address-section">
                <p className="address-label">Deposit Address</p>
                <div className="address-box">
                  <code className="address-text">{depositAddress}</code>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="copy-btn"
                    title="Copy address"
                  >
                    <Icon name="copy" className="icon-inline" /> Copy
                  </button>
                </div>
                <p className="address-hint">Transfer to this address from Binance before confirming</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="button-group">
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={handleBinanceClick}
            >
              <Icon name="link" className="icon-inline" /> Continue on Binance
            </button>

            <button
              type="button"
              className="btn btn-success btn-full"
              onClick={handleCompleteDeposit}
              disabled={loading}
            >
              {loading ? 'Processing...' : '✓ I Completed Deposit'}
            </button>

            <a href="/transactions" className="btn btn-secondary btn-full">
              ← Cancel
            </a>
          </div>
        </form>

        {/* Info Box */}
        <div className="info-box">
          <p><Icon name="lock" className="icon-inline" /> <strong>Secure:</strong> Your transactions are encrypted. We never store payment details.</p>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};
