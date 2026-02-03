import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WithdrawalsPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';
import API from '../../../services/api';

export const WithdrawalsPage = () => {
  const [crypto, setCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // fetch profile to get balance
    let mounted = true;
    API.get('/auth/me').then(res => {
      if (mounted && res?.data?.user) setBalance(res.data.user.balance ?? 0);
    }).catch(()=>{});
    return () => { mounted = false; };
  }, []);

  const feeRate = 0.30; // legacy: 30%

  const fee = Number(amount || 0) * feeRate;
  const total = Number(amount || 0) + fee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !address) return alert('Enter amount and wallet address');
    if (balance != null && total > balance) return alert('Insufficient balance for amount + fee');
    try {
      setLoading(true);
      const res = await API.post('/withdrawals', { crypto_type: crypto, amount: Number(amount), crypto_address: address });
      // on success, navigate to withdrawal fee / processing (legacy used withdrawal-fee.html)
      navigate('/withdrawal-fee', { state: { withdrawal: res.data.withdrawal || res.data } });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || err.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="withdrawals-page">
      <h1>Withdraw Crypto</h1>
      <p className="muted">Request a withdrawal — fees shown below are applied immediately.</p>

      <div className="withdraw-grid">
        <div className="user-card">
          <h3>Your Account</h3>
          <div className="field"><span>Available Balance</span><strong>{balance != null ? `$${balance.toFixed(2)}` : 'Loading...'}</strong></div>
        </div>

        <form className="withdraw-form" onSubmit={handleSubmit}>
          <label>
            <span>Cryptocurrency</span>
            <select value={crypto} onChange={(e)=>setCrypto(e.target.value)}>
              <option>BTC</option>
              <option>ETH</option>
              <option>USDT</option>
              <option>USDC</option>
              <option>XRP</option>
              <option>ADA</option>
            </select>
          </label>

          <label>
            <span>Amount</span>
            <input type="number" step="0.00000001" min="0" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" />
          </label>

          <div className="fee-box">
            <div><span>Fee ({feeRate*100}%)</span><strong>${fee.toFixed(2)}</strong></div>
            <div><span>Total Deducted</span><strong>${total.toFixed(2)}</strong></div>
          </div>

          <label>
            <span>Wallet Address</span>
            <input type="text" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Your wallet address" />
          </label>

          <div className="actions">
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Request Withdrawal'}</button>
            <button type="button" className="btn btn-secondary" onClick={()=>{ setAmount(''); setAddress(''); }}>Clear</button>
          </div>
        </form>
      </div>

      <MobileBottomNav />
    </div>
  );
};
