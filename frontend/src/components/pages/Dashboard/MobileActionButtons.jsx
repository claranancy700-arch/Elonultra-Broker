import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import './MobileActionButtons.css';

const MobileActionButtons = () => {
  const navigate = useNavigate();

  const handleDeposit = () => {
    navigate('/deposit');
  };

  const handleWithdraw = () => {
    navigate('/withdrawals');
  };

  const handleAccount = () => {
    navigate('/settings');
  };

  const { logout } = useAuth();
  const handleLogout = () => {
    try { logout(); } catch(e){ console.warn('Logout error', e); }
    navigate('/login', { replace: true });
  };

  return (
    <div className="mobile-action-buttons">
      <button className="action-btn" onClick={handleDeposit} title="Deposit funds">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Deposit</span>
      </button>
      <button className="action-btn" onClick={handleWithdraw} title="Withdraw funds">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19v-14" />
        </svg>
        <span>Withdraw</span>
      </button>
      <button className="action-btn" onClick={handleAccount} title="Account settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
        </svg>
        <span>Account</span>
      </button>
      <button className="action-btn logout-btn" onClick={handleLogout} title="Logout">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        <span>Logout</span>
      </button>
    </div>
  );
};

export default MobileActionButtons;
