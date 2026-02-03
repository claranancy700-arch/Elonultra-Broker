import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import API from '../../../services/api';
import { AdminStats } from './AdminStats';
import { AdminUserList } from './AdminUserList';
import { AdminTransactionList } from './AdminTransactionList';
import { AdminSettings } from './AdminSettings';
import './AdminPage.css';

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Protect admin route
  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
    } else {
      fetchAdminData();
    }
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, txRes] = await Promise.all([
        API.get('/admin/stats').catch(() => null),
        API.get('/admin/users?limit=10').catch(() => null),
        API.get('/admin/transactions?limit=10').catch(() => null)
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (usersRes?.data) setUsers(usersRes.data);
      if (txRes?.data) setTransactions(txRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>Manage platform, users, and transactions</p>
      </div>

      <div className="admin-container">
        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button 
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            💳 Transactions
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="admin-section">
            <h2>Platform Statistics</h2>
            <AdminStats stats={stats} loading={loading} />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="admin-section">
            <h2>User Management</h2>
            <AdminUserList users={users} loading={loading} />
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="admin-section">
            <h2>Transaction Monitoring</h2>
            <AdminTransactionList transactions={transactions} loading={loading} />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="admin-section">
            <h2>Platform Settings</h2>
            <AdminSettings onSave={(settings) => console.log('Saving settings:', settings)} />
          </div>
        )}
      </div>
    </div>
  );
};
