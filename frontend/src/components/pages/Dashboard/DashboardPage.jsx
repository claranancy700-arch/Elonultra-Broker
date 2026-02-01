import React, { useEffect, useState } from 'react';
import API from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [pRes, tRes] = await Promise.all([
          API.get('/portfolio'),
          API.get('/transactions'),
        ]);

        if (!mounted) return;
        setPortfolio(pRes.data || null);
        setTransactions(tRes.data?.transactions || []);
      } catch (err) {
        console.error('Dashboard load error', err);
        setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="panel">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="panel error">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Dashboard</h1>
        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Welcome, <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{user?.email || 'User'}</span>
        </div>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-title">Total Portfolio Value</div>
          <div className="card-value">${portfolio?.total_value?.toFixed(2) ?? '0.00'}</div>
          <div className="card-change positive">+$0.00 (+0%)</div>
        </div>

        <div className="card">
          <div className="card-title">24h Change</div>
          <div className="card-value">+$0.00</div>
          <div className="card-change positive">+0%</div>
        </div>

        <div className="card">
          <div className="card-title">Available Balance</div>
          <div className="card-value">${portfolio?.balance?.toFixed(2) ?? '0.00'}</div>
          <div className="muted" style={{ marginTop: '8px' }}>Ready to invest</div>
        </div>

        <div className="card">
          <div className="card-title">Active Positions</div>
          <div className="card-value">{portfolio?.positions?.length ?? 0}</div>
          <div className="muted" style={{ marginTop: '8px' }}>Holdings</div>
        </div>
      </div>

      {/* Positions Section */}
      <div className="panel">
        <h3>Positions</h3>
        {portfolio?.positions?.length ? (
          <div className="positions-list">
            {portfolio.positions.map((pos) => (
              <div key={pos.coin} className="position-item">
                <div className="position-coin">{pos.coin}</div>
                <div className="position-meta">{pos.amount} • ${pos.price?.toFixed(2) ?? '0.00'}</div>
                <div className="position-value">${pos.value?.toFixed(2) ?? '0.00'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No positions yet</div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="panel">
        <h3>Recent Transactions</h3>
        {transactions.length ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.type}</td>
                    <td>{tx.amount} {tx.method || tx.currency}</td>
                    <td><span className={`status-pill status-${tx.status?.toLowerCase()}`}>{tx.status}</span></td>
                    <td>{new Date(tx.createdAt || tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No recent transactions</div>
        )}
      </div>
    </div>
  );
};
