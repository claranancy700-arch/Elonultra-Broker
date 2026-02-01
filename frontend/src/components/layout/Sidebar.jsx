import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <Link 
        to="/dashboard" 
        className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
      >
        📊 Dashboard
      </Link>
      <Link 
        to="/markets" 
        className={`sidebar-link ${isActive('/markets') ? 'active' : ''}`}
      >
        📈 Markets
      </Link>
      <Link 
        to="/transactions" 
        className={`sidebar-link ${isActive('/transactions') ? 'active' : ''}`}
      >
        💳 Transactions
      </Link>
      <Link 
        to="/settings" 
        className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}
      >
        ⚙️ Settings
      </Link>
      <Link 
        to="/help" 
        className={`sidebar-link ${isActive('/help') ? 'active' : ''}`}
      >
        ❓ Help & Docs
      </Link>
    </aside>
  );
};
