import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="site-header">
      <div className="container">
        <Link to="/" className="brand">
          <img src="/images/elon-logo-v2.svg" alt="EUE" className="brand-logo" />
          <span style={{display:'block'}}>ELON ULTRA ELONS</span>
        </Link>
        
        <nav className="nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/markets">Markets</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/help">Support</Link>
          {/* Theme toggle moved to floating control (ThemeFab) */}
          {user && (
            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{color:'#ef4444'}}>
              Logout
            </a>
          )}
        </nav>
      </div>
    </header>
  );
};
