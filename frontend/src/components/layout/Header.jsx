import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const headerEl = document.querySelector('.site-header');
    if (!headerEl) return () => {};

    const publishHeaderHeight = () => {
      const height = Math.ceil(headerEl.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--global-header-height', `${height}px`);
    };

    publishHeaderHeight();

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => publishHeaderHeight());
      observer.observe(headerEl);
    }

    window.addEventListener('resize', publishHeaderHeight);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', publishHeaderHeight);
      document.documentElement.style.setProperty('--global-header-height', '0px');
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenLiveSupport = () => {
    if (typeof window !== 'undefined' && typeof window.openSupportChat === 'function') {
      window.openSupportChat();
      return;
    }
    navigate('/help');
  };

  return (
    <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to={user ? '/dashboard' : '/'} className="brand">
          <img src="/images/elon-logo.svg" alt="ELON-ULTRA" className="brand-logo" />
          <span style={{display:'block'}}>ELON-ULTRA</span>
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
        {/* show mobile auth buttons for non-logged in users */}
        {!user && (
          <div className="mobile-auth-buttons">
            <Link to="/login" className="nav-login" style={{marginLeft: 0, fontSize: '12px', padding: '4px 10px'}}>Login</Link>
            <Link to="/signup" className="nav-signup" style={{marginLeft: 0, fontSize: '12px', padding: '4px 12px'}}>Get Started</Link>
          </div>
        )}
        {user && (
          <button
            className="mobile-support"
            onClick={(e) => { e.preventDefault(); handleOpenLiveSupport(); }}
            aria-label="Open live support chat"
            title="Live Support"
            style={{background:'transparent',border:'none',cursor:'pointer',padding:8,display:'inline-flex',alignItems:'center',gap:6}}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 16 0" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round"/>
              <rect x="3" y="11" width="3" height="6" rx="1.3" stroke="var(--accent)" strokeWidth="1.7"/>
              <rect x="18" y="11" width="3" height="6" rx="1.3" stroke="var(--accent)" strokeWidth="1.7"/>
              <circle cx="12" cy="11" r="2.6" stroke="var(--accent)" strokeWidth="1.7"/>
              <path d="M8.8 18.2C9.7 16.9 10.8 16.2 12 16.2c1.2 0 2.3 0.7 3.2 2" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round"/>
              <path d="M15.8 16.2h1.7c1 0 1.8 0.8 1.8 1.8v0.2c0 1-0.8 1.8-1.8 1.8h-2" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="14.7" cy="20" r="0.9" fill="var(--accent)"/>
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};
