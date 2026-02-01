import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
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
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
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
