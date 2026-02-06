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
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/markets">Markets</Link>
              <Link to="/transactions">Transactions</Link>
              <Link to="/settings">Account</Link>
              {user?.isAdmin && (
                <>
                  <Link to="/admin">Admin</Link>
                  <Link to="/pro-admin">Pro Admin</Link>
                </>
              )}
              <Link to="/help">Support</Link>
            </>
          ) : (
            <>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/testimonies">Testimonies</Link>
              <Link to="/login" className="nav-login">Login</Link>
              <Link to="/signup" className="nav-signup">Sign Up</Link>
            </>
          )}
          {/* Theme toggle moved to floating control (ThemeFab) */}
        </nav>
        {user && (
          <button
            className="mobile-logout"
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
            aria-label="Logout"
            title="Logout"
            style={{background:'transparent',border:'none',cursor:'pointer',padding:6,display:'inline-flex',alignItems:'center',gap:6}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M10 17L15 12L10 7" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H3" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12C21 16.4183 17.4183 20 13 20H11" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 4H13C17.4183 4 21 7.58172 21 12" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};
