import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import API from '../../../services/api';
import './SettingsPage.css';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
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

  const [bankingData, setBankingData] = useState({
    country: '',
    acctNumber: '',
    acctName: '',
    personalId: '',
    branch: '',
    email: user?.email || ''
  });

  const [verificationData, setVerificationData] = useState({
    email: user?.email || '',
    code: ''
  });

  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }

    // load API keys
    let mounted = true;
    API.get('/users/api-keys')
      .then(res => {
        if (!mounted) return;
        setApiKeys(res.data || []);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [user]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Profile handlers
  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    clearMessages();
    setProfileLoading(true);

    try {
      const response = await API.put('/auth/me', {
        fullName: profileData.name,
        email: profileData.email,
        phone: profileData.phone
      });

      if (response.data) {
        setSuccess('Profile updated successfully');
        setEditingProfile(false);
        // Update local profile data to reflect saved state
        setProfileData(prev => ({
          ...prev,
          name: response.data.user?.fullName || prev.name,
          phone: response.data.user?.phone || prev.phone
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Security handlers
  const handleSecurityChange = (field, value) => {
    setSecurityData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (securityData.newPassword !== securityData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSecurityLoading(true);

    try {
      await API.post('/auth/change-password', {
        currentPassword: securityData.currentPassword,
        newPassword: securityData.newPassword
      });

      setSuccess('Password updated successfully');
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSecurityLoading(false);
    }
  };

  // Preferences handlers
  const handlePreferenceChange = (field) => {
    setPreferences(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      await API.put('/users/preferences', preferences);
      setSuccess('Preferences saved successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  // Banking handlers
  const handleBankingChange = (field, value) => {
    setBankingData(prev => ({ ...prev, [field]: value }));
  };

  const handleSendVerificationCode = async () => {
    clearMessages();
    setLoading(true);

    try {
      await API.post('/users/send-verification-code', {
        email: bankingData.email
      });
      setVerificationCodeSent(true);
      setSuccess('Verification code sent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankingDetails = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      await API.post('/users/banking-details', bankingData);
      setSuccess('Banking details saved successfully');
      setBankingData({
        country: '',
        acctNumber: '',
        acctName: '',
        personalId: '',
        branch: '',
        email: user?.email || ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save banking details');
    } finally {
      setLoading(false);
    }
  };

  // Verification handlers
  const handleVerificationChange = (field, value) => {
    setVerificationData(prev => ({ ...prev, [field]: value }));
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      await API.post('/users/verify-email', {
        email: verificationData.email,
        code: verificationData.code
      });
      setSuccess('Email verified successfully');
      setVerificationData({ email: user?.email || '', code: '' });
      setVerificationCodeSent(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      return;
    }

    clearMessages();
    setLoading(true);

    try {
      await API.delete('/users/account');
      setSuccess('Account deletion initiated. You will be logged out shortly.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1>Account Settings</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="settings-grid">
        {/* Profile Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Profile</h2>
            <button
              className="btn btn-small"
              onClick={() => setEditingProfile(!editingProfile)}
              disabled={loading}
            >
              {editingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {!editingProfile ? (
            <div className="profile-view">
              <div className="profile-item">
                <label>Full Name</label>
                <p>{profileData.name || 'Not set'}</p>
              </div>
              <div className="profile-item">
                <label>Email</label>
                <p>{profileData.email}</p>
              </div>
              <div className="profile-item">
                <label>Phone</label>
                <p>{profileData.phone || 'Not set'}</p>
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
                  disabled={loading}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                  title="Email cannot be changed here"
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                  disabled={loading}
                />
              </label>
              <div className="form-actions">
                <button type="submit" className="btn" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
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
                placeholder="••••••••"
                value={securityData.currentPassword}
                onChange={(e) => handleSecurityChange('currentPassword', e.target.value)}
                disabled={loading}
                required
              />
            </label>
            <label>
              <span>New Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={securityData.newPassword}
                onChange={(e) => handleSecurityChange('newPassword', e.target.value)}
                disabled={loading}
                required
                minLength="8"
              />
            </label>
            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={securityData.confirmPassword}
                onChange={(e) => handleSecurityChange('confirmPassword', e.target.value)}
                disabled={loading}
                required
                minLength="8"
              />
            </label>
            <button type="submit" className="btn" disabled={loading}>
              {securityLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
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
              disabled={loading}
            />
            <span>Email notifications for trades</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.priceAlerts}
              onChange={() => handlePreferenceChange('priceAlerts')}
              disabled={loading}
            />
            <span>Price alerts above 5% change</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.twoFactor}
              onChange={() => handlePreferenceChange('twoFactor')}
              disabled={loading}
            />
            <span>Two-factor authentication</span>
          </label>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
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
              {apiKeys.length === 0 && (
                <tr>
                  <td colSpan="4" className="muted">No API keys found</td>
                </tr>
              )}
              {apiKeys.map(k => (
                <tr key={k.id}>
                  <td><code>{k.keyMasked || k.key}</code></td>
                  <td>{k.createdAt ? k.createdAt.split('T')[0] : '-'}</td>
                  <td>{k.lastUsedAt ? k.lastUsedAt.split('T')[0] : 'Never'}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-small"
                      disabled={loading}
                      onClick={async () => {
                        if (!window.confirm('Revoke this API key?')) return;
                        try {
                          setLoading(true);
                          await API.delete(`/users/api-keys/${k.id}`);
                          setApiKeys(prev => prev.filter(x => x.id !== k.id));
                          setSuccess('Key revoked');
                        } catch (err) {
                          setError(err.response?.data?.message || 'Failed to revoke key');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="btn"
          style={{ marginTop: '16px' }}
          disabled={loading}
          onClick={async () => {
            clearMessages();
            try {
              setLoading(true);
              const res = await API.post('/users/api-keys');
              // server should return new key
              if (res.data) {
                setApiKeys(prev => [res.data, ...prev]);
                setSuccess('New API key generated');
              }
            } catch (err) {
              setError(err.response?.data?.message || 'Failed to generate key');
            } finally {
              setLoading(false);
            }
          }}
        >
          Generate New Key
        </button>
      </div>

      {/* Banking & Verification Section */}
      <div className="settings-section banking">
        <h2>Account Banking & Verification</h2>
        <div className="bank-grid">
          <div className="card banking-card">
            <h3>Banking / Registration</h3>
            <form className="form banking-form registration-form" onSubmit={handleSaveBankingDetails}>
              <label>
                <span>Country</span>
                <select
                  name="country"
                  value={bankingData.country}
                  onChange={(e) => handleBankingChange('country', e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">Select country</option>
                  <option>United States</option>
                  <option>Nigeria</option>
                  <option>United Kingdom</option>
                  <option>Kenya</option>
                  <option>Ghana</option>
                </select>
              </label>
              <label>
                <span>Account Number</span>
                <input
                  name="acctNumber"
                  placeholder="1234567890"
                  value={bankingData.acctNumber}
                  onChange={(e) => handleBankingChange('acctNumber', e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <label>
                <span>Account Name</span>
                <input
                  name="acctName"
                  placeholder="Full name on account"
                  value={bankingData.acctName}
                  onChange={(e) => handleBankingChange('acctName', e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <label>
                <span>Personal ID</span>
                <input
                  name="personalId"
                  placeholder="National ID / Passport"
                  value={bankingData.personalId}
                  onChange={(e) => handleBankingChange('personalId', e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <label>
                <span>Branch</span>
                <input
                  name="branch"
                  placeholder="Branch name or code"
                  value={bankingData.branch}
                  onChange={(e) => handleBankingChange('branch', e.target.value)}
                  disabled={loading}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={bankingData.email}
                  onChange={(e) => handleBankingChange('email', e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={handleSendVerificationCode}
                  disabled={loading || verificationCodeSent}
                >
                  {verificationCodeSent ? 'Code Sent ✓' : 'Send Verification Code'}
                </button>
              </div>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save Banking Details'}
              </button>
            </form>
          </div>

          <div className="card banking-card">
            <h3>Email Verification</h3>
            <form className="form banking-form" onSubmit={handleVerifyEmail}>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={verificationData.email}
                  onChange={(e) => handleVerificationChange('email', e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <label>
                <span>Verification Code</span>
                <input
                  type="text"
                  placeholder="Enter code from email"
                  value={verificationData.code}
                  onChange={(e) => handleVerificationChange('code', e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger-zone">
        <h2 style={{ color: 'var(--danger)' }}>Danger Zone</h2>
        <p className="muted">Irreversible actions. Proceed with caution.</p>
        <button
          className="btn btn-danger"
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Delete Account'}
        </button>
      </div>

      <MobileBottomNav />
    </div>
  );
};
