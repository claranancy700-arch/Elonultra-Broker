import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';
import Icon from '../icons/Icon';

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  // Simple admin check - in production this should be more robust
  const isAdmin = user && (user.email === 'admin@elon-u.com' || user.isAdmin);

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
      {isAdmin && (
        <Link 
          to="/chat-support-unlock" 
          className={`sidebar-link ${isActive('/chat-support-unlock') || isActive('/chatsupport') ? 'active' : ''}`}
        >
          <Icon name="dashboard" className="icon-inline" /> Chat Support
        </Link>
      )}
      
      {isAdmin && (
        <>
          <div className="sidebar-divider"></div>
          <Link 
            to="/admin" 
            className={`sidebar-link ${isActive('/admin') ? 'active' : ''}`}
          >
            <Icon name="settings" className="icon-inline" /> Admin Panel
          </Link>
        </>
      )}
    </aside>
  );
};
