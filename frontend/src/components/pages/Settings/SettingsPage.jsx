import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import API from '../../../services/api';
import './SettingsPage.css';

export const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const resolveProfileName = (userData) => (
    userData?.fullName || userData?.fullname || userData?.name || ''
  );

  const resolveProfilePhone = (userData) => userData?.phone || '';

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: resolveProfileName(user),
    email: user?.email || '',
    phone: resolveProfilePhone(user)
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

  const [editingBank, setEditingBank] = useState(false);
  const [bankSource, setBankSource] = useState('none'); // 'none' | 'server'
  const [bankingLoading, setBankingLoading] = useState(false);

  const [verificationData, setVerificationData] = useState({
    email: user?.email || '',
    code: ''
  });

  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysUnavailable, setApiKeysUnavailable] = useState(false);
  const [bankingUnavailable, setBankingUnavailable] = useState(false);
  const [verificationVerified, setVerificationVerified] = useState(!!(user?.emailVerified || user?.email_verified));

  // UI state
  const [activeSection, setActiveSection] = useState('profile');
  const [navOpen, setNavOpen] = useState(false);
  const [pwStrength, setPwStrength] = useState({ level: 0, cls: '', label: 'Min. 8 characters' });

  const closeNavDrawer = () => setNavOpen(false);
  const toggleNavDrawer = () => setNavOpen(prev => !prev);

  const showSection = (id) => {
    setActiveSection(id);
    closeNavDrawer();
  };

  const updatePwStrength = (val) => {
    const n = val.length;
    let level = 0;
    if (n >= 4) level = 1;
    if (n >= 8) level = 2;
    if (n >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val)) level = 3;
    if (n >= 12 && /[A-Z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)) level = 4;
    const cls = level <= 1 ? 'weak' : level <= 2 ? 'fair' : 'strong';
    const labels = ['', 'Too short', 'Fair', 'Good', 'Strong'];
    setPwStrength({ level, cls, label: val ? (labels[level] || 'Min. 8 characters') : 'Min. 8 characters' });
  };

  const NAV_LABELS = { profile: 'Profile', security: 'Security', notifications: 'Notifications', banking: 'Banking & Verification', apikeys: 'API Keys', danger: 'Danger Zone' };

  // Get user initials for avatar
  const userName = user?.fullName || user?.fullname || user?.name || '';
  const userInitials = userName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || (user?.email?.[0] || 'U').toUpperCase();

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setProfileData({
        name: resolveProfileName(user),
        email: user.email || '',
        phone: resolveProfilePhone(user)
      });
      // set verification state from server-provided user
      setVerificationVerified(!!(user.emailVerified || user.email_verified));
    }

    // load API keys
    let mounted = true;
    API.get('/users/api-keys')
      .then(res => {
        if (!mounted) return;
        setApiKeysUnavailable(false);
        setApiKeys(res.data || []);
      })
      .catch((err) => {
        if (!mounted) return;
        // 404 = endpoint missing on this server; any other error = transient
        if (err?.response?.status === 404) {
          setApiKeysUnavailable(true);
        }
      });
    return () => { mounted = false; };
  }, [user]);

  // If cached auth only has minimal fields (email/id), hydrate profile directly.
  useEffect(() => {
    if (!user) return;

    const hasProfileFromAuth = !!(resolveProfileName(user) || resolveProfilePhone(user));
    if (hasProfileFromAuth) return;

    let mounted = true;
    API.get('/auth/me')
      .then((res) => {
        if (!mounted || !res?.data?.user) return;
        const latestUser = res.data.user;
        setProfileData(prev => ({
          ...prev,
          name: resolveProfileName(latestUser),
          email: latestUser.email || prev.email,
          phone: resolveProfilePhone(latestUser)
        }));
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, [user]);

  // Load saved banking details from API
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
            setEditingBank(false);
          }
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 404) {
          // 404 means no data saved yet — show empty form, not an error
          if (mounted) setEditingBank(true);
          return;
        }
        if (status === undefined || status >= 500) {
          // Only flag unavailable on genuine server/network errors
          if (mounted) setBankingUnavailable(true);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

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
        const savedUser = response.data.user || {};
        setProfileData(prev => ({
          ...prev,
          name: resolveProfileName(savedUser) || prev.name,
          phone: resolveProfilePhone(savedUser) || prev.phone
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
      updateUser({ emailVerified: true });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankingDetails = async (e) => {
    e.preventDefault();
    clearMessages();
    setBankingLoading(true);

    try {
      const res = await API.put('/users/banking-details', bankingData);
      if (res && res.status >= 200 && res.status < 300) {
        setBankingUnavailable(false);
        setSuccess('Banking details saved successfully!');
        setEditingBank(false);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setBankingUnavailable(true);
        setError('Banking details endpoint is not available on this server.');
      } else {
        setError(err.response?.data?.message || 'Failed to save banking details. Please try again.');
      }
    } finally {
      setBankingLoading(false);
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
    <div className="sett-wrap">

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div className="sett-header">
        <div>
          <div className="sett-header-title">Account Settings</div>
          <div className="sett-header-sub">Manage your profile, security, and preferences</div>
        </div>
      </div>

      {/* ── GLOBAL ALERTS ───────────────────────────────────── */}
      {error   && <div className="sett-alert error"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}</div>}
      {success && <div className="sett-alert success"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{success}</div>}

      {/* ── PROFILE HERO ────────────────────────────────────── */}
      <div className="sett-profile-hero">
        <div className="sett-hero-glow"></div>
        <div className="sett-hero-inner">
          <div className="sett-avatar">
            <div className="sett-avatar-circle">{userInitials}</div>
            <div className="sett-avatar-badge"></div>
          </div>
          <div className="sett-hero-info">
            <div className="sett-hero-name">{profileData.name || user?.email || 'User'}</div>
            <div className="sett-hero-email">{profileData.email}</div>
            <div className="sett-hero-badges">
              {verificationVerified && (
                <span className="sett-badge verified">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified
                </span>
              )}
              {preferences.twoFactor && (
                <span className="sett-badge twofactor">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  2FA On
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY: SIDEBAR + CONTENT ──────────────────────────── */}
      <div className="sett-body">

        {/* Mobile hamburger trigger bar */}
        <div className={`sett-mob-bar${navOpen ? ' open' : ''}`} onClick={toggleNavDrawer}>
          <div className="sett-mob-bar-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <span>{NAV_LABELS[activeSection] || 'Profile'}</span>
          </div>
          <svg className="sett-mob-bar-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        {/* Overlay */}
        <div className={`sett-nav-overlay${navOpen ? ' open' : ''}`} onClick={closeNavDrawer}></div>

        {/* Sidebar nav */}
        <nav className={`sett-nav${navOpen ? ' open' : ''}`} aria-label="Settings sections">
          <div className="sett-nav-drawer-head" style={{ display: 'none' }}></div>
          <button className={`sett-nav-item${activeSection === 'profile' ? ' active' : ''}`} onClick={() => showSection('profile')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>
            <span>Profile</span>
          </button>
          <button className={`sett-nav-item${activeSection === 'security' ? ' active' : ''}`} onClick={() => showSection('security')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Security</span>
          </button>
          <button className={`sett-nav-item${activeSection === 'notifications' ? ' active' : ''}`} onClick={() => showSection('notifications')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span>Notifications</span>
          </button>
          <button className={`sett-nav-item${activeSection === 'banking' ? ' active' : ''}`} onClick={() => showSection('banking')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            <span>Banking &amp; Verification</span>
          </button>
          <button className={`sett-nav-item${activeSection === 'apikeys' ? ' active' : ''}`} onClick={() => showSection('apikeys')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            <span>API Keys</span>
          </button>
          <div className="sett-nav-divider"></div>
          <button className={`sett-nav-item danger${activeSection === 'danger' ? ' active' : ''}`} onClick={() => showSection('danger')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Danger Zone</span>
          </button>
        </nav>

        {/* Content area */}
        <div className="sett-content">

          {/* ── PROFILE SECTION ─────────────────────────────── */}
          <div className="sett-section" style={{ display: activeSection === 'profile' ? 'flex' : 'none' }}>

            {/* View panel */}
            {!editingProfile && (
              <div className="sett-panel">
                <div className="sett-panel-head">
                  <div className="sett-panel-title-wrap">
                    <div className="sett-panel-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>
                    </div>
                    <div>
                      <div className="sett-panel-title">Profile Information</div>
                      <div className="sett-panel-sub">Your personal details</div>
                    </div>
                  </div>
                  <button className="sett-btn ghost" onClick={() => setEditingProfile(true)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                </div>
                <div className="sett-panel-body">
                  <div className="sett-info-grid">
                    <div className="sett-info-item"><div className="sett-info-label">Full Name</div><div className="sett-info-val">{profileData.name || <span className="placeholder">Not set</span>}</div></div>
                    <div className="sett-info-item"><div className="sett-info-label">Email Address</div><div className="sett-info-val">{profileData.email}</div></div>
                    <div className="sett-info-item"><div className="sett-info-label">Phone Number</div><div className={`sett-info-val${!profileData.phone ? ' placeholder' : ''}`}>{profileData.phone || 'Not set'}</div></div>
                    <div className="sett-info-item"><div className="sett-info-label">Account Status</div><div className="sett-info-val">{verificationVerified ? 'Verified' : 'Unverified'}</div></div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit panel */}
            {editingProfile && (
              <div className="sett-panel">
                <div className="sett-panel-head">
                  <div className="sett-panel-title-wrap">
                    <div className="sett-panel-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </div>
                    <div>
                      <div className="sett-panel-title">Edit Profile</div>
                      <div className="sett-panel-sub">Update your personal details</div>
                    </div>
                  </div>
                  <button className="sett-btn ghost" onClick={() => setEditingProfile(false)}>Cancel</button>
                </div>
                <div className="sett-panel-body">
                  <form className="sett-form" onSubmit={handleSaveProfile}>
                    <div className="sett-row-2">
                      <div className="sett-field">
                        <label className="sett-field-label">Full Name</label>
                        <input className="sett-field-input" type="text" value={profileData.name} onChange={e => handleProfileChange('name', e.target.value)} placeholder="Your full name" disabled={profileLoading} />
                      </div>
                      <div className="sett-field">
                        <label className="sett-field-label">Phone Number</label>
                        <input className="sett-field-input" type="tel" value={profileData.phone} onChange={e => handleProfileChange('phone', e.target.value)} placeholder="+1 (555) 000-0000" disabled={profileLoading} />
                      </div>
                    </div>
                    <div className="sett-field">
                      <label className="sett-field-label">Email Address</label>
                      <input className="sett-field-input" type="email" value={profileData.email} disabled />
                      <span className="sett-field-hint">Email cannot be changed here. Contact support.</span>
                    </div>
                    <div className="sett-form-footer">
                      <button type="button" className="sett-btn ghost" onClick={() => setEditingProfile(false)}>Cancel</button>
                      <button type="submit" className="sett-btn primary" disabled={profileLoading}>{profileLoading ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Email verification status */}
            <div className="sett-panel">
              <div className="sett-panel-head">
                <div className="sett-panel-title-wrap">
                  <div className="sett-panel-icon green">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>
                    <div className="sett-panel-title">Email Verification</div>
                    <div className="sett-panel-sub">Confirm your email address</div>
                  </div>
                </div>
                {verificationVerified && <span className="sett-badge verified"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>}
              </div>
              <div className="sett-panel-body">
                {verificationVerified ? (
                  <div className="sett-alert success">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Your email address {profileData.email} is verified.
                  </div>
                ) : (
                  <div className="sett-alert error">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Email not verified. Go to Banking &amp; Verification to verify.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECURITY SECTION ────────────────────────────── */}
          <div className="sett-section" style={{ display: activeSection === 'security' ? 'flex' : 'none' }}>
            <div className="sett-panel">
              <div className="sett-panel-head">
                <div className="sett-panel-title-wrap">
                  <div className="sett-panel-icon blue">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <div>
                    <div className="sett-panel-title">Change Password</div>
                    <div className="sett-panel-sub">Use a strong, unique password</div>
                  </div>
                </div>
              </div>
              <div className="sett-panel-body">
                <form className="sett-form" onSubmit={handleUpdatePassword}>
                  <div className="sett-field">
                    <label className="sett-field-label">Current Password</label>
                    <input className="sett-field-input" type="password" placeholder="••••••••" autoComplete="current-password" value={securityData.currentPassword} onChange={e => handleSecurityChange('currentPassword', e.target.value)} required />
                  </div>
                  <div className="sett-row-2">
                    <div className="sett-field">
                      <label className="sett-field-label">New Password</label>
                      <input className="sett-field-input" type="password" placeholder="••••••••" autoComplete="new-password" value={securityData.newPassword} onChange={e => { handleSecurityChange('newPassword', e.target.value); updatePwStrength(e.target.value); }} required minLength="8" />
                      <div className="sett-pw-strength">
                        {[0,1,2,3].map(i => (
                          <div key={i} className={`sett-pw-bar${i < pwStrength.level ? ` filled ${pwStrength.cls}` : ''}`}></div>
                        ))}
                      </div>
                      <div className="sett-pw-label">{pwStrength.label}</div>
                    </div>
                    <div className="sett-field">
                      <label className="sett-field-label">Confirm New Password</label>
                      <input className="sett-field-input" type="password" placeholder="••••••••" autoComplete="new-password" value={securityData.confirmPassword} onChange={e => handleSecurityChange('confirmPassword', e.target.value)} required minLength="8" />
                    </div>
                  </div>
                  <div className="sett-form-footer">
                    <button type="submit" className="sett-btn primary" disabled={securityLoading}>{securityLoading ? 'Updating...' : 'Update Password'}</button>
                  </div>
                </form>
              </div>
            </div>

            <div className="sett-panel">
              <div className="sett-panel-head">
                <div className="sett-panel-title-wrap">
                  <div className="sett-panel-icon blue">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div>
                    <div className="sett-panel-title">Two-Factor Authentication</div>
                    <div className="sett-panel-sub">Extra layer of login security</div>
                  </div>
                </div>
                {preferences.twoFactor && <span className="sett-badge twofactor">Enabled</span>}
              </div>
              <div className="sett-panel-body">
                <div className="sett-toggle-row" style={{ paddingTop: 0 }}>
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Authenticator App</div>
                    <div className="sett-toggle-desc">Require a 6-digit code from your authenticator on each login</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" checked={preferences.twoFactor} onChange={() => handlePreferenceChange('twoFactor')} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
                <div className="sett-toggle-row">
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Login Notifications</div>
                    <div className="sett-toggle-desc">Email alert whenever a new device signs in</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" checked={preferences.emailNotifications} onChange={() => handlePreferenceChange('emailNotifications')} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── NOTIFICATIONS SECTION ───────────────────────── */}
          <div className="sett-section" style={{ display: activeSection === 'notifications' ? 'flex' : 'none' }}>
            <div className="sett-panel">
              <div className="sett-panel-head">
                <div className="sett-panel-title-wrap">
                  <div className="sett-panel-icon gold">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <div>
                    <div className="sett-panel-title">Notification Preferences</div>
                    <div className="sett-panel-sub">Choose what you want to hear about</div>
                  </div>
                </div>
                <button className="sett-btn primary" style={{ fontSize: '12px', padding: '8px 14px' }} onClick={handleSavePreferences} disabled={loading}>{loading ? 'Saving…' : 'Save'}</button>
              </div>
              <div className="sett-panel-body">
                <div className="sett-toggle-row" style={{ paddingTop: 0 }}>
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Trade Confirmations</div>
                    <div className="sett-toggle-desc">Email me when a buy or sell order is filled</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" checked={preferences.emailNotifications} onChange={() => handlePreferenceChange('emailNotifications')} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
                <div className="sett-toggle-row">
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Price Alerts</div>
                    <div className="sett-toggle-desc">Notify me when an asset moves more than 5% in 24 h</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" checked={preferences.priceAlerts} onChange={() => handlePreferenceChange('priceAlerts')} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
                <div className="sett-toggle-row">
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Deposit &amp; Withdrawal</div>
                    <div className="sett-toggle-desc">Confirm every fund movement via email</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" checked={preferences.emailNotifications} onChange={() => handlePreferenceChange('emailNotifications')} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
                <div className="sett-toggle-row">
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Two-Factor Authentication</div>
                    <div className="sett-toggle-desc">Require 2FA on every login for extra security</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" checked={preferences.twoFactor} onChange={() => handlePreferenceChange('twoFactor')} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
                <div className="sett-toggle-row">
                  <div className="sett-toggle-info">
                    <div className="sett-toggle-label">Marketing &amp; News</div>
                    <div className="sett-toggle-desc">Product updates, promotions, and platform news</div>
                  </div>
                  <label className="sett-toggle">
                    <input type="checkbox" defaultChecked={false} />
                    <span className="sett-toggle-track"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── BANKING SECTION ─────────────────────────────── */}
          <div className="sett-section" style={{ display: activeSection === 'banking' ? 'flex' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2px 0 4px' }}>
              <div className="sett-panel-icon green" style={{ width: '28px', height: '28px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800' }}>Account Banking &amp; Verification</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Banking registration and email verification</div>
              </div>
            </div>

            <div className="sett-bank-grid">
              {/* Banking / Registration */}
              <div>
                {!editingBank ? (
                  <div className="sett-panel">
                    <div className="sett-panel-head">
                      <div className="sett-panel-title-wrap">
                        <div className="sett-panel-icon green">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                        <div>
                          <div className="sett-panel-title">Banking / Registration</div>
                          <div className="sett-panel-sub">Your withdrawal details</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="bank-status-badge">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Saved
                        </span>
                        <button className="sett-btn ghost" onClick={() => setEditingBank(true)} disabled={bankingLoading || bankingUnavailable}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                      </div>
                    </div>
                    <div className="sett-panel-body">
                      <div className="sett-form" style={{ gap: '10px' }}>
                        <div className="sett-info-item"><div className="sett-info-label">Country</div><div className={`sett-info-val${!bankingData.country ? ' placeholder' : ''}`}>{bankingData.country || 'Not set'}</div></div>
                        <div className="sett-info-item"><div className="sett-info-label">Account Number</div><div className={`sett-info-val${!bankingData.acctNumber ? ' placeholder' : ''}`}>{bankingData.acctNumber || 'Not set'}</div></div>
                        <div className="sett-info-item"><div className="sett-info-label">Account Name</div><div className={`sett-info-val${!bankingData.acctName ? ' placeholder' : ''}`}>{bankingData.acctName || 'Not set'}</div></div>
                        <div className="sett-info-item"><div className="sett-info-label">Personal ID</div><div className={`sett-info-val${!bankingData.personalId ? ' placeholder' : ''}`}>{bankingData.personalId || 'Not set'}</div></div>
                        <div className="sett-info-item"><div className="sett-info-label">Branch</div><div className={`sett-info-val${!bankingData.branch ? ' placeholder' : ''}`}>{bankingData.branch || 'Not set'}</div></div>
                        <div className="sett-info-item"><div className="sett-info-label">Email</div><div className="sett-info-val">{bankingData.email}</div></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sett-panel">
                    <div className="sett-panel-head">
                      <div className="sett-panel-title-wrap">
                        <div className="sett-panel-icon green">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </div>
                        <div>
                          <div className="sett-panel-title">Edit Banking Details</div>
                          <div className="sett-panel-sub">Used for withdrawal processing</div>
                        </div>
                      </div>
                      <button className="sett-btn ghost" onClick={() => setEditingBank(false)}>Cancel</button>
                    </div>
                    <div className="sett-panel-body">
                      <form className="sett-form" onSubmit={handleSaveBankingDetails}>
                        <div className="sett-field">
                          <label className="sett-field-label">Country</label>
                          <select className="sett-field-input" style={{ cursor: 'pointer' }} value={bankingData.country} onChange={e => handleBankingChange('country', e.target.value)}>
                            <option value="" disabled>Select country</option>
                            {['United States','United Kingdom','Canada','Australia','Nigeria','Kenya','Ghana','South Africa','Egypt','Uganda','Tanzania','India','Pakistan','Bangladesh','Philippines','Singapore','Malaysia','Thailand','Indonesia','Vietnam','Brazil','Mexico','Argentina','Colombia','Chile','Germany','France','Spain','Italy','Netherlands','Belgium','Switzerland','Austria','Sweden','Norway','Denmark','Ireland'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="sett-field">
                          <label className="sett-field-label">Account Number</label>
                          <input className="sett-field-input" type="text" placeholder="1234567890" value={bankingData.acctNumber} onChange={e => handleBankingChange('acctNumber', e.target.value)} />
                        </div>
                        <div className="sett-field">
                          <label className="sett-field-label">Account Name</label>
                          <input className="sett-field-input" type="text" placeholder="Full name on account" value={bankingData.acctName} onChange={e => handleBankingChange('acctName', e.target.value)} />
                        </div>
                        <div className="sett-field">
                          <label className="sett-field-label">Personal ID</label>
                          <input className="sett-field-input" type="text" placeholder="National ID / Passport" value={bankingData.personalId} onChange={e => handleBankingChange('personalId', e.target.value)} />
                          <span className="sett-field-hint">Required for identity verification during withdrawals.</span>
                        </div>
                        <div className="sett-field">
                          <label className="sett-field-label">Branch</label>
                          <input className="sett-field-input" type="text" placeholder="Branch name or code" value={bankingData.branch} onChange={e => handleBankingChange('branch', e.target.value)} />
                        </div>
                        <div className="sett-field">
                          <label className="sett-field-label">Email</label>
                          <input className="sett-field-input" type="email" placeholder="you@example.com" value={bankingData.email} onChange={e => handleBankingChange('email', e.target.value)} />
                        </div>
                        <div className="sett-form-footer">
                          <button type="button" className="sett-btn ghost" onClick={() => setEditingBank(false)}>Cancel</button>
                          <button type="submit" className="sett-btn primary" disabled={bankingLoading}>{bankingLoading ? 'Saving...' : 'Save Details'}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Verification card */}
              <div className="sett-panel">
                <div className="sett-panel-head">
                  <div className="sett-panel-title-wrap">
                    <div className="sett-panel-icon gold">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    </div>
                    <div>
                      <div className="sett-panel-title">Email Verification</div>
                      <div className="sett-panel-sub">Confirm your email address</div>
                    </div>
                  </div>
                </div>
                <div className="sett-panel-body">
                  {verificationVerified ? (
                    <div className="sett-verified-state">
                      <div className="sett-verified-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div className="sett-verified-title">Email Verified</div>
                      <div className="sett-verified-sub">{verificationData.email}</div>
                    </div>
                  ) : (
                    <form className="sett-form" onSubmit={handleVerifyEmail}>
                      <div className="sett-field">
                        <label className="sett-field-label">Email Address</label>
                        <div className="sett-send-row">
                          <input className="sett-field-input" type="email" placeholder="you@example.com" value={verificationData.email} onChange={e => handleVerificationChange('email', e.target.value)} />
                          <button type="button" className="sett-btn primary sm" onClick={async () => {
                            clearMessages();
                            setLoading(true);
                            try {
                              await API.post('/users/send-verification-code');
                              setVerificationCodeSent(true);
                              setSuccess('Code generated — check the admin panel.');
                            } catch (err) {
                              setError(err.response?.data?.error || 'Failed to generate code');
                            } finally {
                              setLoading(false);
                            }
                          }} disabled={loading}>
                            {verificationCodeSent ? 'Resend' : 'Send Code'}
                          </button>
                        </div>
                      </div>
                      {verificationCodeSent && (
                        <div className="sett-field">
                          <label className="sett-field-label">Verification Code</label>
                          <input className="sett-field-input" type="text" placeholder="Enter code from email" maxLength="8" value={verificationData.code} onChange={e => handleVerificationChange('code', e.target.value)} />
                          <span className="sett-field-hint">Code sent to {verificationData.email} — expires in 10 minutes.</span>
                        </div>
                      )}
                      {verificationCodeSent && (
                        <div className="sett-form-footer">
                          <button type="button" className="sett-btn ghost" onClick={() => { setVerificationCodeSent(false); handleVerificationChange('code',''); }}>Reset</button>
                          <button type="submit" className="sett-btn primary" disabled={loading}>{loading ? 'Verifying…' : 'Verify Email'}</button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── API KEYS SECTION ────────────────────────────── */}
          <div className="sett-section" style={{ display: activeSection === 'apikeys' ? 'flex' : 'none' }}>
            <div className="sett-panel">
              <div className="sett-panel-head">
                <div className="sett-panel-title-wrap">
                  <div className="sett-panel-icon blue">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                  </div>
                  <div>
                    <div className="sett-panel-title">API Keys</div>
                    <div className="sett-panel-sub">Programmatic access to your account</div>
                  </div>
                </div>
                <button className="sett-btn primary" disabled={loading || apiKeysUnavailable} onClick={async () => {
                  clearMessages();
                  try {
                    setLoading(true);
                    const res = await API.post('/users/api-keys');
                    if (res.data) { setApiKeys(prev => [res.data, ...prev]); setSuccess('New API key generated'); }
                  } catch (err) {
                    if (err?.response?.status === 404) { setApiKeysUnavailable(true); setError('API key management is not available on this server yet.'); }
                    else setError(err.response?.data?.message || 'Failed to generate key');
                  } finally { setLoading(false); }
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/></svg>
                  Generate Key
                </button>
              </div>
              <div className="sett-panel-body">
                {apiKeysUnavailable && <div className="sett-alert error" style={{ marginBottom: '12px' }}>API key management is not available on this server yet.</div>}
                <div className="sett-table-wrap">
                  <table className="sett-table">
                    <thead><tr><th>Key</th><th>Created</th><th>Last Used</th><th>Action</th></tr></thead>
                    <tbody>
                      {apiKeys.length === 0 ? (
                        <tr><td colSpan="4" className="sett-table-empty">{apiKeysUnavailable ? 'Feature unavailable' : 'No API keys yet.'}</td></tr>
                      ) : apiKeys.map(k => (
                        <tr key={k.id}>
                          <td><code>{k.keyMasked || k.key}</code></td>
                          <td style={{ color: 'var(--muted)' }}>{k.createdAt ? k.createdAt.split('T')[0] : '—'}</td>
                          <td style={{ color: 'var(--muted)' }}>{k.lastUsedAt ? k.lastUsedAt.split('T')[0] : 'Never'}</td>
                          <td>
                            <button className="sett-btn danger-soft" style={{ padding: '5px 10px', fontSize: '12px' }} disabled={loading || apiKeysUnavailable} onClick={async () => {
                              if (!window.confirm('Revoke this API key?')) return;
                              try {
                                setLoading(true);
                                await API.delete(`/users/api-keys/${k.id}`);
                                setApiKeys(prev => prev.filter(x => x.id !== k.id));
                                setSuccess('Key revoked');
                              } catch (err) {
                                if (err?.response?.status === 404) { setApiKeysUnavailable(true); setError('API key management is not available on this server yet.'); }
                                else setError(err.response?.data?.message || 'Failed to revoke key');
                              } finally { setLoading(false); }
                            }}>Revoke</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ── DANGER ZONE SECTION ─────────────────────────── */}
          <div className="sett-section" style={{ display: activeSection === 'danger' ? 'flex' : 'none' }}>
            <div className="sett-panel sett-danger-panel">
              <div className="sett-panel-head">
                <div className="sett-panel-title-wrap">
                  <div className="sett-panel-icon danger">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <div>
                    <div className="sett-panel-title">Danger Zone</div>
                    <div className="sett-panel-sub">Irreversible account actions</div>
                  </div>
                </div>
              </div>
              <div className="sett-panel-body">
                <div className="sett-danger-row" style={{ paddingTop: 0 }}>
                  <div>
                    <div className="sett-danger-info-title">Export Account Data</div>
                    <div className="sett-danger-info-desc">Download a full archive of your trades, portfolio history, and profile data.</div>
                  </div>
                  <button className="sett-btn ghost">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export
                  </button>
                </div>
                <div className="sett-danger-row">
                  <div>
                    <div className="sett-danger-info-title">Deactivate Account</div>
                    <div className="sett-danger-info-desc">Temporarily disable your account. You can reactivate by logging in again.</div>
                  </div>
                  <button className="sett-btn outline-danger">Deactivate</button>
                </div>
                <div className="sett-danger-row">
                  <div>
                    <div className="sett-danger-info-title">Delete Account</div>
                    <div className="sett-danger-info-desc">Permanently delete your account and all associated data. This cannot be undone.</div>
                  </div>
                  <button className="sett-btn outline-danger" onClick={handleDeleteAccount} disabled={loading}>Delete Account</button>
                </div>
              </div>
            </div>
          </div>

        </div>{/* /sett-content */}
      </div>{/* /sett-body */}
    </div>
  );
};

export default SettingsPage;