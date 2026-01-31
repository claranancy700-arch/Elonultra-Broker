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

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h2>Welcome{user?.name ? `, ${user.name}` : ''}</h2>
      </header>

      {loading ? (
        <div className="panel">Loading dashboard...</div>
      ) : error ? (
        <div className="panel error">{error}</div>
      ) : (
        <div className="dashboard-grid">
          <section className="panel summary">
            <h3>Account Summary</h3>
            <div className="summary-row">
              <div>
                <div className="label">Cash Balance</div>
                <div className="value">${portfolio?.balance?.toFixed(2) ?? '0.00'}</div>
              </div>
              <div>
                <div className="label">Portfolio Value</div>
                <div className="value">${portfolio?.total_value?.toFixed(2) ?? '0.00'}</div>
              </div>
            </div>
          </section>

          <section className="panel positions">
            <h3>Positions</h3>
            {portfolio?.positions?.length ? (
              <ul className="positions-list">
                {portfolio.positions.map((pos) => (
                  <li key={pos.coin} className="position-item">
                    <div className="coin">{pos.coin}</div>
                    <div className="meta">{pos.amount} • ${pos.price.toFixed(2)}</div>
                    <div className="val">${pos.value.toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No positions yet</div>
            )}
          </section>

          <section className="panel transactions">
            <h3>Recent Transactions</h3>
            {transactions.length ? (
              <ul className="tx-list">
                {transactions.slice(0, 10).map((tx) => (
                  <li key={tx.id} className="tx-item">
                    <div className="tx-type">{tx.type}</div>
                    <div className="tx-amount">{tx.amount} {tx.method || tx.currency}</div>
                    <div className="tx-status">{tx.status}</div>
                    <div className="tx-time">{new Date(tx.createdAt || tx.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty">No recent transactions</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
