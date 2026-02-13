import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
import Icon from '../icons/Icon';

export const Sidebar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <Link 
        to="/dashboard" 
        className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
      >
        <Icon name="dashboard" className="icon-inline" /> Dashboard
      </Link>
      <Link 
        to="/markets" 
        className={`sidebar-link ${isActive('/markets') ? 'active' : ''}`}
      >
        <Icon name="chart" className="icon-inline" /> Markets
      </Link>
      <Link 
        to="/transactions" 
        className={`sidebar-link ${isActive('/transactions') ? 'active' : ''}`}
      >
        <Icon name="coin" className="icon-inline" /> Transactions
      </Link>
      <Link 
        to="/settings" 
        className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}
      >
        <Icon name="settings" className="icon-inline" /> Settings
      </Link>
      <Link 
        to="/help" 
        className={`sidebar-link ${isActive('/help') ? 'active' : ''}`}
      >
        <Icon name="link" className="icon-inline" /> Help & Docs
      </Link>
    </aside>
  );
};
