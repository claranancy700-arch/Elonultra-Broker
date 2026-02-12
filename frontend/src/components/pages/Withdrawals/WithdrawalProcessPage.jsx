import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import './WithdrawalProcessPage.css';

export default function WithdrawalProcessPage() {
  const navigate = useNavigate();
  const { loading } = useApi();
  const [step, setStep] = useState(1); // 1: Transfer Info, 2: Recipient Info, 3: Review
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    currency: '',
    amount: '',
    address: '',
    name: '',
    country: '',
    accountType: 'bank',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    bankCode: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNextStep = async () => {
    setError('');

    if (step === 1) {
      if (!formData.currency.trim()) {
        setError('Please select a currency');
        return;
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.accountType === 'crypto') {
        if (!formData.address.trim()) {
          setError('Please enter a crypto address');
          return;
        }
        if (!formData.name.trim()) {
          setError('Please enter a name');
          return;
        }
      } else {
        if (!formData.bankName.trim()) {
          setError('Please enter bank name');
          return;
        }
        if (!formData.accountNumber.trim()) {
          setError('Please enter account number');
          return;
        }
        if (!formData.accountHolder.trim()) {
          setError('Please enter account holder name');
          return;
        }
        if (!formData.country.trim()) {
          setError('Please select a country');
          return;
        }
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    setError('');

    try {
      const API_BASE = import.meta.env.VITE_API_URL || window?.__ELON_API_BASE__ || '/api';
      const response = await fetch(API_BASE + '/withdrawals/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          currency: formData.currency,
          amount: parseFloat(formData.amount),
          recipient: {
            type: formData.accountType,
            ...(formData.accountType === 'crypto'
              ? {
                  address: formData.address,
                  name: formData.name,
                }
              : {
                  bankName: formData.bankName,
                  accountNumber: formData.accountNumber,
                  accountHolder: formData.accountHolder,
                  country: formData.country,
                  bankCode: formData.bankCode,
                }),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Withdrawal processing failed');
        return;
      }

      // Redirect to fee confirmation page
      const params = new URLSearchParams({
        amount: formData.amount,
        currency: formData.currency,
        id: data.withdrawalId,
      });
      navigate(`/withdrawal-fee?${params.toString()}`);
    } catch (err) {
      setError(err.message || 'Network error');
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="withdrawal-process-container">
      <div className="withdrawal-process-card">
        <div className="process-header">
          <h1>Withdrawal Processing</h1>
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Step 1: Transfer Info */}
        {step === 1 && (
          <div className="step-content">
            <h2>Transfer Information</h2>

            <div className="form-group">
              <label htmlFor="currency">Digital Currency</label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
              >
                <option value="">Select currency</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="ETH">Ethereum (ETH)</option>
                <option value="USDT">USDT (ERC-20)</option>
                <option value="USDC">USDC (ERC-20)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Withdrawal Amount</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.00000001"
                min="0"
              />
              <small className="form-hint">
                Available Balance will be checked during processing
              </small>
            </div>
          </div>
        )}

        {/* Step 2: Recipient Info */}
        {step === 2 && (
          <div className="step-content">
            <h2>Recipient Information</h2>

            <div className="form-group">
              <label>Recipient Type</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="accountType"
                    value="crypto"
                    checked={formData.accountType === 'crypto'}
                    onChange={handleChange}
                  />
                  <span>Crypto Wallet</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="accountType"
                    value="bank"
                    checked={formData.accountType === 'bank'}
                    onChange={handleChange}
                  />
                  <span>Bank Account</span>
                </label>
              </div>
            </div>

            {formData.accountType === 'crypto' ? (
              <>
                <div className="form-group">
                  <label htmlFor="address">Wallet Address</label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="0x..."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Account name or label"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="">Select country</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Nigeria</option>
                    <option>Kenya</option>
                    <option>Ghana</option>
                    <option>India</option>
                    <option>Canada</option>
                    <option>Australia</option>
                  </select>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="accountNumber">Account Number</label>
                    <input
                      type="text"
                      id="accountNumber"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleChange}
                      placeholder="1234567890"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="accountHolder">Account Holder</label>
                    <input
                      type="text"
                      id="accountHolder"
                      name="accountHolder"
                      value={formData.accountHolder}
                      onChange={handleChange}
                      placeholder="Full name"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="bankName">Bank Name</label>
                    <input
                      type="text"
                      id="bankName"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      placeholder="Bank name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="bankCode">Bank Code (optional)</label>
                    <input
                      type="text"
                      id="bankCode"
                      name="bankCode"
                      value={formData.bankCode}
                      onChange={handleChange}
                      placeholder="SWIFT/IBAN"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="step-content">
            <h2>Review Your Withdrawal</h2>

            <div className="review-summary">
              <div className="review-row">
                <span className="label">Currency</span>
                <span className="value">{formData.currency}</span>
              </div>
              <div className="review-row">
                <span className="label">Amount</span>
                <span className="value">{parseFloat(formData.amount).toFixed(8)}</span>
              </div>
              <div className="review-row">
                <span className="label">Fee (30%)</span>
                <span className="value accent">
                  {(parseFloat(formData.amount) * 0.3).toFixed(8)}
                </span>
              </div>
              <div className="review-row divider">
                <span className="label">Total Deducted</span>
                <span className="value total">
                  {(parseFloat(formData.amount) * 1.3).toFixed(8)}
                </span>
              </div>

              <div className="review-row">
                <span className="label">Recipient Type</span>
                <span className="value">{formData.accountType === 'crypto' ? 'Crypto Wallet' : 'Bank Account'}</span>
              </div>
              {formData.accountType === 'crypto' ? (
                <div className="review-row">
                  <span className="label">Wallet Address</span>
                  <span className="value mono">{formData.address.substring(0, 10)}...{formData.address.substring(-4)}</span>
                </div>
              ) : (
                <>
                  <div className="review-row">
                    <span className="label">Bank</span>
                    <span className="value">{formData.bankName}</span>
                  </div>
                  <div className="review-row">
                    <span className="label">Account</span>
                    <span className="value mono">{formData.accountNumber.substring(0, 4)}****{formData.accountNumber.substring(-4)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="review-notice">
              <strong>Please review carefully.</strong> Once submitted, you'll need to pay the fee
              before processing continues.
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="process-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </button>
          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={handleNextStep}>
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Continue to Fee Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
