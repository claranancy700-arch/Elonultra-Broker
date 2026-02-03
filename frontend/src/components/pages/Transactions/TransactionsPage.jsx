import React, { useState, useEffect } from 'react';
import './TransactionsPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';

export const TransactionsPage = () => {
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [depRes, withRes, tradeRes] = await Promise.all([
          fetch('/api/transactions?type=deposit'),
          fetch('/api/transactions?type=withdrawal'),
          fetch('/api/trades')
        ]);
        setDeposits(await depRes.json() || []);
        setWithdrawals(await withRes.json() || []);
        setTrades(await tradeRes.json() || []);
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
                <td>{new Date(item.created_at || item.date).toLocaleString()}</td>
                <td>{item.method || item.type || item.order_type}</td>
                <td>{item.asset || item.symbol || 'N/A'}</td>
                <td>{item.amount?.toFixed(2)}</td>
                <td>
                  <span className={`status ${item.status?.toLowerCase()}`}>
                    {item.status || 'pending'}
                  </span>
                </td>
                {columns.length > 5 && <td><code>{item.tx_id || item.id || 'N/A'}</code></td>}
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
              <a href="/deposit" className="btn" style={{ marginTop: '16px' }}>Add Funds</a>
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
              <a href="/withdrawals" className="btn" style={{ marginTop: '16px' }}>Withdraw Funds</a>
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
                          <td>{new Date(t.created_at || t.date).toLocaleString()}</td>
                          <td>{t.order_type || t.type || 'N/A'}</td>
                          <td>{t.symbol || t.asset || 'N/A'}</td>
                          <td>{t.amount?.toFixed(4)}</td>
                          <td>${t.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td>${(t.amount * t.price)?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
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

      <MobileBottomNav />
    </div>
  );
};
