import React, { useState } from 'react';
import './SettingsPage.css';
import MobileBottomNav from '../Dashboard/MobileBottomNav';

export const SettingsPage = () => {
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 234 567 8900'
  });

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    priceAlerts: false,
    twoFactor: true
  });

  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field, value) => {
    setSecurityData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field) => {
    setPreferences(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    console.log('Saving profile:', profileData);
    setEditingProfile(false);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (securityData.newPassword !== securityData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    console.log('Updating password');
    setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    console.log('Saving preferences:', preferences);
  };

  return (
    <div className="settings-page">
      <h1>Account Settings</h1>

      <div className="settings-grid">
        {/* Profile Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Profile</h2>
            <button
              className="btn btn-small"
              onClick={() => setEditingProfile(!editingProfile)}
            >
              {editingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {!editingProfile ? (
            <div className="profile-view">
              <div className="profile-item">
                <label>Full Name</label>
                <p>{profileData.name}</p>
              </div>
              <div className="profile-item">
                <label>Email</label>
                <p>{profileData.email}</p>
              </div>
              <div className="profile-item">
                <label>Phone</label>
                <p>{profileData.phone}</p>
              </div>
            </div>
          ) : (
            <form className="form" onSubmit={handleSaveProfile}>
              <label>
                <span>Full Name</span>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn">Save Profile</button>
              </div>
            </form>
          )}
        </div>

        {/* Security Section */}
        <div className="settings-section">
          <h2>Security</h2>
          <form className="form" onSubmit={handleUpdatePassword}>
            <label>
              <span>Current Password</span>
              <input
                type="password"
                placeholder="•••••••"
                value={securityData.currentPassword}
                onChange={(e) => handleSecurityChange('currentPassword', e.target.value)}
              />
            </label>
            <label>
              <span>New Password</span>
              <input
                type="password"
                placeholder="•••••••"
                value={securityData.newPassword}
                onChange={(e) => handleSecurityChange('newPassword', e.target.value)}
              />
            </label>
            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                placeholder="•••••••"
                value={securityData.confirmPassword}
                onChange={(e) => handleSecurityChange('confirmPassword', e.target.value)}
              />
            </label>
            <button type="submit" className="btn">Update Password</button>
          </form>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="settings-section api-keys">
        <h2>API Keys</h2>
        <p className="muted">Use these keys to access the API programmatically</p>
        <div className="table-wrapper">
          <table className="api-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>sk_live_4e...8f</code></td>
                <td>2025-01-15</td>
                <td>2025-01-27</td>
                <td><button className="btn btn-danger btn-small">Revoke</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button className="btn" style={{ marginTop: '16px' }} onClick={() => alert('API key generation coming soon')}>
          Generate New Key
        </button>
      </div>

      {/* Preferences Section */}
      <div className="settings-section">
        <h2>Preferences</h2>
        <form className="form" onSubmit={handleSavePreferences}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.emailNotifications}
              onChange={() => handlePreferenceChange('emailNotifications')}
            />
            <span>Email notifications for trades</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.priceAlerts}
              onChange={() => handlePreferenceChange('priceAlerts')}
            />
            <span>Price alerts above 5% change</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.twoFactor}
              onChange={() => handlePreferenceChange('twoFactor')}
            />
            <span>Two-factor authentication</span>
          </label>
          <button type="submit" className="btn">Save Preferences</button>
        </form>
      </div>

      <MobileBottomNav />
    </div>
  );
};
