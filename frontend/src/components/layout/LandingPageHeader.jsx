import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './LandingPageHeader.css';

export const LandingPageHeader = () => {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`landing-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <Link to="/" className="brand">
          <img src="/images/elon-logo-v2.svg" alt="EUE" className="brand-logo" />
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
            </>
          )}
        </nav>

        {/* Auth buttons */}
        {!loading && (
          <div className="landing-header-auth-buttons">
            <Link to="/login" className="landing-auth-login">Login</Link>
            <Link to="/signup" className="landing-auth-signup">Get Started</Link>
          </div>
        )}
      </div>
    </header>
  );
};
