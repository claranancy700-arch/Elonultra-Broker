import React from 'react';

export const AdminStats = ({ stats, loading }) => {
  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: '👥',
      change: '+12%'
    },
    {
      label: 'Active Users (24h)',
      value: stats?.activeUsers || 0,
      icon: '🟢',
      change: '+8%'
    },
    {
      label: 'Total Trading Volume',
      value: `$${(stats?.totalVolume || 0).toLocaleString()}`,
      icon: '📊',
      change: '+24%'
    },
    {
      label: 'Platform Revenue',
      value: `$${(stats?.revenue || 0).toLocaleString()}`,
      icon: '💰',
      change: '+18%'
    },
    {
      label: 'Total Deposits',
      value: `$${(stats?.totalDeposits || 0).toLocaleString()}`,
      icon: '📥',
      change: '+15%'
    },
    {
      label: 'Total Withdrawals',
      value: `$${(stats?.totalWithdrawals || 0).toLocaleString()}`,
      icon: '📤',
      change: '-5%'
    }
  ];

  return (
    <div className="admin-stats-grid">
      {statCards.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-icon">{stat.icon}</div>
          <div className="stat-details">
            <h4>{stat.label}</h4>
            <p className="stat-value">{stat.value}</p>
            <p className={`stat-change ${stat.change.includes('+') ? 'positive' : 'negative'}`}>
              {stat.change} from last month
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
