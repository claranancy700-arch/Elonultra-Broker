import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import API from '../../../services/api';
import './ProAdminPage.css';

export const ProAdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('advanced');
  const [loading, setLoading] = useState(false);

  // Protect pro-admin route
  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="pro-admin-page">
      <div className="admin-header">
        <h1>🚀 Pro Admin Panel</h1>
        <p>Advanced platform management and analytics</p>
      </div>

      <div className="pro-admin-container">
        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            🔧 Advanced Settings
          </button>
          <button 
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
          <button 
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security
          </button>
          <button 
            className={`tab ${activeTab === 'api' ? 'active' : ''}`}
            onClick={() => setActiveTab('api')}
          >
            🔌 API Management
          </button>
          <button 
            className={`tab ${activeTab === 'maintenance' ? 'active' : ''}`}
            onClick={() => setActiveTab('maintenance')}
          >
            🛠️ Maintenance
          </button>
        </div>

        {/* Advanced Settings Tab */}
        {activeTab === 'advanced' && (
          <div className="admin-section">
            <h2>Advanced Platform Settings</h2>
            
            <div className="settings-card">
              <h3>Trading Configuration</h3>
              <div className="setting-item">
                <label>Max Leverage</label>
                <input type="number" defaultValue="10" min="1" max="100" />
              </div>
              <div className="setting-item">
                <label>Minimum Trade Amount (USD)</label>
                <input type="number" defaultValue="10" />
              </div>
              <div className="setting-item">
                <label>Maximum Trade Amount (USD)</label>
                <input type="number" defaultValue="1000000" />
              </div>
              <button className="btn btn-primary">Save Trading Config</button>
            </div>

            <div className="settings-card">
              <h3>Fee Configuration</h3>
              <div className="setting-item">
                <label>Standard Maker Fee (%)</label>
                <input type="number" step="0.01" defaultValue="0.1" />
              </div>
              <div className="setting-item">
                <label>Standard Taker Fee (%)</label>
                <input type="number" step="0.01" defaultValue="0.15" />
              </div>
              <div className="setting-item">
                <label>VIP Discount (%)</label>
                <input type="number" step="0.01" defaultValue="50" />
              </div>
              <button className="btn btn-primary">Save Fee Config</button>
            </div>

            <div className="settings-card">
              <h3>Withdrawal Configuration</h3>
              <div className="setting-item">
                <label>Minimum Withdrawal (USD)</label>
                <input type="number" defaultValue="10" />
              </div>
              <div className="setting-item">
                <label>Maximum Daily Withdrawal (USD)</label>
                <input type="number" defaultValue="100000" />
              </div>
              <div className="setting-item">
                <label>Withdrawal Processing Time (hours)</label>
                <input type="number" defaultValue="24" />
              </div>
              <button className="btn btn-primary">Save Withdrawal Config</button>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="admin-section">
            <h2>Advanced Analytics</h2>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Revenue by Period</h3>
                <div className="chart-placeholder">
                  <p>📊 Monthly revenue chart would go here</p>
                </div>
              </div>

              <div className="analytics-card">
                <h3>User Growth</h3>
                <div className="chart-placeholder">
                  <p>📈 User growth trend would go here</p>
                </div>
              </div>

              <div className="analytics-card">
                <h3>Trading Volume Breakdown</h3>
                <div className="chart-placeholder">
                  <p>💹 Volume by asset type would go here</p>
                </div>
              </div>

              <div className="analytics-card">
                <h3>Regional Distribution</h3>
                <div className="chart-placeholder">
                  <p>🌍 Users by region would go here</p>
                </div>
              </div>
            </div>

            <div className="export-section">
              <h3>Export Reports</h3>
              <div className="button-group">
                <button className="btn btn-secondary">📥 Export CSV</button>
                <button className="btn btn-secondary">📊 Export PDF</button>
                <button className="btn btn-secondary">📑 Export JSON</button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="admin-section">
            <h2>Security & Compliance</h2>
            
            <div className="settings-card">
              <h3>Two-Factor Authentication</h3>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Require 2FA for Admin Accounts
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input type="checkbox" defaultChecked />
                  Require 2FA for Large Withdrawals
                </label>
              </div>
            </div>

            <div className="settings-card">
              <h3>IP Whitelist</h3>
              <textarea 
                placeholder="One IP per line (e.g., 192.168.1.1)"
                rows="5"
              />
              <button className="btn btn-primary">Update Whitelist</button>
            </div>

            <div className="settings-card">
              <h3>Audit Logs</h3>
              <div className="audit-log">
                <div className="log-entry">
                  <span className="timestamp">2025-02-03 14:30:22</span>
                  <span className="action">Admin Login</span>
                  <span className="user">john@admin.com</span>
                </div>
                <div className="log-entry">
                  <span className="timestamp">2025-02-03 14:25:15</span>
                  <span className="action">Fee Updated</span>
                  <span className="user">jane@admin.com</span>
                </div>
                <div className="log-entry">
                  <span className="timestamp">2025-02-03 14:20:00</span>
                  <span className="action">User Suspended</span>
                  <span className="user">admin@admin.com</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Management Tab */}
        {activeTab === 'api' && (
          <div className="admin-section">
            <h2>API Management</h2>
            
            <div className="settings-card">
              <h3>API Keys</h3>
              <div className="api-keys-list">
                <div className="api-key-item">
                  <div className="key-info">
                    <p className="key-name">Production API Key</p>
                    <p className="key-value">sk_live_4eC39HqLyjWDarhtT662F621</p>
                  </div>
                  <div className="key-actions">
                    <button className="btn-small">Rotate</button>
                    <button className="btn-small danger">Revoke</button>
                  </div>
                </div>

                <div className="api-key-item">
                  <div className="key-info">
                    <p className="key-name">Testing API Key</p>
                    <p className="key-value">sk_test_4eC39HqLyjWDarhtT663G732</p>
                  </div>
                  <div className="key-actions">
                    <button className="btn-small">Rotate</button>
                    <button className="btn-small danger">Revoke</button>
                  </div>
                </div>
              </div>
              <button className="btn btn-primary">Generate New Key</button>
            </div>

            <div className="settings-card">
              <h3>API Rate Limits</h3>
              <div className="setting-item">
                <label>Requests per minute (default)</label>
                <input type="number" defaultValue="60" />
              </div>
              <div className="setting-item">
                <label>Requests per minute (VIP)</label>
                <input type="number" defaultValue="300" />
              </div>
              <button className="btn btn-primary">Save Limits</button>
            </div>
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <div className="admin-section">
            <h2>System Maintenance</h2>
            
            <div className="settings-card">
              <h3>Scheduled Maintenance</h3>
              <div className="setting-item">
                <label>Maintenance Mode</label>
                <select>
                  <option>Off</option>
                  <option>Scheduled</option>
                  <option>Emergency</option>
                </select>
              </div>
              <div className="setting-item">
                <label>Maintenance Message</label>
                <textarea 
                  placeholder="Message shown to users during maintenance"
                  rows="3"
                />
              </div>
              <button className="btn btn-primary">Enable Maintenance</button>
            </div>

            <div className="settings-card">
              <h3>Database Maintenance</h3>
              <div className="button-group">
                <button className="btn btn-secondary">🔄 Backup Database</button>
                <button className="btn btn-secondary">🧹 Clean Logs</button>
                <button className="btn btn-secondary">⚡ Optimize Tables</button>
              </div>
            </div>

            <div className="settings-card">
              <h3>System Health</h3>
              <div className="health-item">
                <span>API Server</span>
                <span className="status healthy">✓ Healthy</span>
              </div>
              <div className="health-item">
                <span>Database</span>
                <span className="status healthy">✓ Healthy</span>
              </div>
              <div className="health-item">
                <span>Cache Server</span>
                <span className="status healthy">✓ Healthy</span>
              </div>
              <div className="health-item">
                <span>Message Queue</span>
                <span className="status healthy">✓ Healthy</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
