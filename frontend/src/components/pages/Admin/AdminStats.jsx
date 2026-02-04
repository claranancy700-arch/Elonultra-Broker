import React from 'react';
import Icon from '../../icons/Icon';

export const AdminStats = ({ stats, loading }) => {
  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: 'dashboard',
      change: '+12%'
    },
    {
      label: 'Active Users (24h)',
      value: stats?.activeUsers || 0,
      icon: 'dashboard',
      change: '+8%'
    },
    {
      label: 'Total Trading Volume',
      value: `$${(stats?.totalVolume || 0).toLocaleString()}`,
      icon: 'chart',
      change: '+24%'
    },
    {
      label: 'Platform Revenue',
      value: `$${(stats?.revenue || 0).toLocaleString()}`,
      icon: 'money',
      change: '+18%'
    },
    {
      label: 'Total Deposits',
      value: `$${(stats?.totalDeposits || 0).toLocaleString()}`,
      icon: 'bank',
      change: '+15%'
    },
    {
      label: 'Total Withdrawals',
      value: `$${(stats?.totalWithdrawals || 0).toLocaleString()}`,
      icon: 'coin',
      change: '-5%'
    }
  ];

  return (
    <div className="admin-stats-grid">
      {statCards.map((stat, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-icon"><Icon name={stat.icon} /></div>
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
