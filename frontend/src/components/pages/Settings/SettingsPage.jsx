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

  const [bankSaved, setBankSaved] = useState(false);
  const [editingBank, setEditingBank] = useState(true);
  const [bankSource, setBankSource] = useState('none'); // 'none' | 'local' | 'server'

  const [verificationData, setVerificationData] = useState({
    email: user?.email || '',
    code: ''
  });

  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [verificationVerified, setVerificationVerified] = useState(!!user?.emailVerified);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
      // set verification state from server-provided user
      setVerificationVerified(!!user.emailVerified);
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

  // Load saved banking details (API first, fallback to localStorage)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      try {
        const res = await API.get('/users/banking-details');
        if (res?.data) {
          const data = res.data;
          if (mounted) {
            setBankingData(prev => ({ ...prev, ...data }));
            setBankSaved(true);
            setEditingBank(false);
            setBankSource('server');
            console.log('Loaded banking details from API', data);
          }
          return;
        }
      } catch (err) {
        console.log('No banking-details from API, will try localStorage', err && err.message);
        // ignore, we'll fallback to localStorage
      }

      try {
        const raw = localStorage.getItem('bankingDetails');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (mounted && parsed) {
            setBankingData(prev => ({ ...prev, ...parsed }));
            setBankSaved(true);
            setEditingBank(false);
            setBankSource('local');
            console.log('Loaded banking details from localStorage', parsed);
          }
        }
      } catch (err) {
        console.log('Failed to load bankingDetails from localStorage', err && err.message);
        // ignore parse errors
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  const getLocalBankingRaw = () => {
    try {
      return localStorage.getItem('bankingDetails') || 'null';
    } catch (e) {
      return 'error';
    }
  };

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

    let localSaveSuccess = false;
    let saveSource = 'none';

    try {
      // Try to save to API
      const res = await API.post('/users/banking-details', bankingData);
      if (res && res.status >= 200 && res.status < 300) {
        saveSource = 'server';
      }
    } catch (err) {
      // API failed, we'll fallback to localStorage
      console.log('API save failed, will fallback to local storage:', err && err.message);
      saveSource = 'local';
    }

    // Always save to localStorage as fallback (and for offline)
    try {
      localStorage.setItem('bankingDetails', JSON.stringify(bankingData));
      localSaveSuccess = true;
      console.log('bankingDetails saved to localStorage', bankingData);
      if (saveSource === 'none') saveSource = 'local';
    } catch (err) {
      console.log('Failed to save bankingDetails to localStorage', err && err.message);
      console.error('Failed to save to localStorage:', err);
      if (saveSource === 'none') saveSource = 'none';
    }

    // Show appropriate message
    if (localSaveSuccess) {
      setBankSource(saveSource);
      setSuccess('Banking details saved successfully! ✓');
      setBankSaved(true);
      setEditingBank(false);
      console.log('bankSaved set true, editingBank set false; source=', saveSource);
      // Don't clear the form - let user see what was saved  
    } else {
      setError('Failed to save banking details. Please try again.');
    }

    setLoading(false);
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
      setVerificationVerified(true);
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
                autoComplete="current-password"
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
                autoComplete="new-password"
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
                autoComplete="new-password"
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

      {import.meta.env.DEV && (
        <div style={{ marginTop: 16, padding: 12, border: '1px dashed #ccc', borderRadius: 6 }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Debug (dev only)</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div><strong>bankSaved:</strong> {String(bankSaved)}</div>
            <div><strong>bankSource:</strong> {bankSource}</div>
            <div style={{ minWidth: 220 }}><strong>localStorage:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', background: '#f7f7f7', padding: 8 }}>{getLocalBankingRaw()}</pre>
            </div>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary>bankingData</summary>
            <pre style={{ maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(bankingData, null, 2)}</pre>
          </details>
        </div>
      )}

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
            {bankSaved && !editingBank ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Banking / Registration</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        background: bankSource === 'server' ? 'var(--success)' : (bankSource === 'local' ? '#ffd86b' : '#ddd'),
                        color: bankSource === 'server' ? '#fff' : '#000',
                        fontSize: 12
                      }}
                    >{bankSource === 'server' ? 'Saved (server)' : (bankSource === 'local' ? 'Saved (local)' : 'Saved')}</span>
                    <button
                      className="btn btn-small"
                      onClick={() => { setEditingBank(true); setBankSaved(false); setBankSource('none'); clearMessages(); }}
                      disabled={loading}
                    >Edit</button>
                  </div>
                </div>
                <div className="profile-view">
                  <div className="profile-item"><label>Country</label><p>{bankingData.country || 'Not set'}</p></div>
                  <div className="profile-item"><label>Account Number</label><p>{bankingData.acctNumber || 'Not set'}</p></div>
                  <div className="profile-item"><label>Account Name</label><p>{bankingData.acctName || 'Not set'}</p></div>
                  <div className="profile-item"><label>Personal ID</label><p>{bankingData.personalId || 'Not set'}</p></div>
                  <div className="profile-item"><label>Branch</label><p>{bankingData.branch || 'Not set'}</p></div>
                  <div className="profile-item"><label>Email</label><p>{bankingData.email || 'Not set'}</p></div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Banking / Registration</h3>
                </div>
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
                      <option>United Kingdom</option>
                      <option>Canada</option>
                      <option>Australia</option>
                      <option>Nigeria</option>
                      <option>Kenya</option>
                      <option>Ghana</option>
                      <option>South Africa</option>
                      <option>Egypt</option>
                      <option>Uganda</option>
                      <option>Tanzania</option>
                      <option>India</option>
                      <option>Pakistan</option>
                      <option>Bangladesh</option>
                      <option>Philippines</option>
                      <option>Singapore</option>
                      <option>Malaysia</option>
                      <option>Thailand</option>
                      <option>Indonesia</option>
                      <option>Vietnam</option>
                      <option>Brazil</option>
                      <option>Mexico</option>
                      <option>Argentina</option>
                      <option>Colombia</option>
                      <option>Chile</option>
                      <option>Germany</option>
                      <option>France</option>
                      <option>Spain</option>
                      <option>Italy</option>
                      <option>Netherlands</option>
                      <option>Belgium</option>
                      <option>Switzerland</option>
                      <option>Austria</option>
                      <option>Sweden</option>
                      <option>Norway</option>
                      <option>Denmark</option>
                      <option>Ireland</option>
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
            )}
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
                  disabled={loading || verificationVerified}
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
                  disabled={loading || verificationVerified}
                  required
                />
              </label>
              <button type="submit" className="btn" disabled={loading || verificationVerified}>
                {verificationVerified ? 'Verified ✓' : (loading ? 'Verifying...' : 'Verify Email')}
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
    </div>
  );
};

