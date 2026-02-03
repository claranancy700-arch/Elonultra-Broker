import React, { useState } from 'react';

export const AdminTransactionList = ({ transactions, loading, onAction }) => {
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) {
    return <div className="loading">Loading transactions...</div>;
  }

  const filteredTx = transactions.filter(tx => {
    const typeMatch = filterType === 'all' || tx.type === filterType;
    const statusMatch = filterStatus === 'all' || tx.status === filterStatus;
    return typeMatch && statusMatch;
  });

  return (
    <div className="admin-transactions-section">
      <div className="section-controls">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
          <option value="all">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="trade">Trades</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filteredTx.length > 0 ? (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id}>
                  <td>#{tx.id}</td>
                  <td className="email">{tx.user_email || tx.userId || 'N/A'}</td>
                  <td>
                    <span className="tx-type">{tx.type}</span>
                  </td>
                  <td>${(tx.amount || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${(tx.status || 'pending').toLowerCase()}`}>
                      {tx.status || 'Pending'}
                    </span>
                  </td>
                  <td>{new Date(tx.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn-small" 
                      onClick={() => onAction && onAction('view', tx)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data">No transactions found</p>
      )}
    </div>
  );
};
