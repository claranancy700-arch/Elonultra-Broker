import React, { useState } from 'react';

export const AdminUserList = ({ users, loading, onAction }) => {
  const [sortBy, setSortBy] = useState('created_at');
  const [filterStatus, setFilterStatus] = useState('all');

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  const filteredUsers = filterStatus === 'all' 
    ? users 
    : users.filter(u => (u.status || 'active') === filterStatus);

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'balance') return (b.balance || 0) - (a.balance || 0);
    if (sortBy === 'created_at') return new Date(b.created_at) - new Date(a.created_at);
    return 0;
  });

  return (
    <div className="admin-users-section">
      <div className="section-controls">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
          <option value="created_at">Sort by Date</option>
          <option value="balance">Sort by Balance</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="filter-select">
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {sortedUsers.length > 0 ? (
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Name</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td className="email">{u.email}</td>
                  <td>{u.name || 'N/A'}</td>
                  <td>${(u.balance || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${(u.status || 'active').toLowerCase()}`}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn-small" 
                      onClick={() => onAction && onAction('view', u)}
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
        <p className="no-data">No users found</p>
      )}
    </div>
  );
};
