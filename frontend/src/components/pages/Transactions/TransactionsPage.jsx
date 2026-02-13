import React, { useState, useEffect } from 'react';
import './TransactionsPage.css';
import { Link } from 'react-router-dom';
import API from '../../../services/api';

export const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to safely format dates
  const formatDate = (dateStr) => {
    if (!dateStr) {
      console.warn('Missing date:', dateStr);
      return 'N/A';
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateStr);
        return 'N/A';
      }
      return date.toLocaleString();
    } catch (err) {
      console.warn('Date parse error:', dateStr, err.message);
      return 'N/A';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [depRes, withRes, tradeRes] = await Promise.all([
          API.get('/transactions?type=deposit'),
          API.get('/transactions?type=withdrawal'),
          API.get('/trades')
        ]);
        // Extract transactions from the success response structure
        setDeposits(depRes.data?.transactions || []);
        setWithdrawals(withRes.data?.transactions || []);
        // Trades endpoint returns trades directly
        setTrades(tradeRes.data?.trades || []);
      } catch (err) {
        console.error('Failed to fetch transaction data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
  };

  const TransactionTable = ({ data, emptyMsg, columns }) => (
    <div className="table-wrapper">
      <table className="tx-table">
        <thead>
          <tr>
            {columns.map(col => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((item, idx) => (
              <tr key={idx}>
                <td>{formatDate(item.created_at)}</td>
                <td>{item.method || item.type || item.order_type}</td>
                <td>{item.asset || item.symbol || 'N/A'}</td>
                <td>{(Number(item.amount) || 0).toFixed(2)}</td>
                <td>
                  <span className={`status ${item.status?.toLowerCase()}`}>
                    {item.status || 'pending'}
                  </span>
                </td>
                {columns.length > 5 && <td><code>{item.txid || item.tx_id || item.id || 'N/A'}</code></td>}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                {emptyMsg}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="transactions-page">
      <h1>Transactions</h1>
      <p className="muted">Deposit, withdrawal, and trade history</p>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'deposits' ? 'active' : ''}`}
          onClick={() => switchTab('deposits')}
        >
          Deposits
        </button>
        <button
          className={`tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
          onClick={() => switchTab('withdrawals')}
        >
          Withdrawals
        </button>
        <button
          className={`tab-btn ${activeTab === 'trades' ? 'active' : ''}`}
          onClick={() => switchTab('trades')}
        >
          Trades
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading transaction history...</div>
      ) : (
        <>
          {activeTab === 'deposits' && (
            <div className="tab-content active">
              <h2>Deposit History</h2>
              <TransactionTable
                data={deposits}
                columns={['Date', 'Method', 'Asset', 'Amount', 'Status', 'TxID']}
                emptyMsg="No deposits yet"
              />
              <Link to="/deposit" className="btn" style={{ marginTop: '16px' }}>Add Funds</Link>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="tab-content active">
              <h2>Withdrawal History</h2>
              <TransactionTable
                data={withdrawals}
                columns={['Date', 'Method', 'Asset', 'Amount', 'Status', 'TxID']}
                emptyMsg="No withdrawals yet"
              />
              <Link to="/withdrawals" className="btn" style={{ marginTop: '16px' }}>Withdraw Funds</Link>
            </div>
          )}

          {activeTab === 'trades' && (
            <div className="tab-content active">
              <h2>Trade History</h2>
              <div className="table-wrapper">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length ? (
                      trades.map((t, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(t.created_at || t.date)}</td>
                          <td>{t.order_type || t.type || 'N/A'}</td>
                          <td>{t.symbol || t.asset || 'N/A'}</td>
                          <td>{(Number(t.amount) || 0).toFixed(4)}</td>
                          <td>${(Number(t.price) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td>${((Number(t.amount) || 0) * (Number(t.price) || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
                          No trades yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
