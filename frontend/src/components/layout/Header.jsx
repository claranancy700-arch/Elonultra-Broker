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
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          ELON ULTRA ELONS
        </Link>
        
        <nav className="nav-menu">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/markets" className="nav-link">Markets</Link>
          <Link to="/transactions" className="nav-link">Transactions</Link>
          {user?.isAdmin && <Link to="/admin" className="nav-link">Admin</Link>}
        </nav>

        <div className="header-right">
          {user ? (
            <>
              <span className="user-name">{user.email}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="login-link">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
};
