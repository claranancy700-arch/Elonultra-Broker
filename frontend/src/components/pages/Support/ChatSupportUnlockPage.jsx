import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import './ChatSupportUnlockPage.css';

const CHAT_SUPPORT_UNLOCK_KEY = 'chat_support_unlocked';
const CHAT_SUPPORT_ADMIN_KEY = 'chat_support_admin_key';

export const ChatSupportUnlockPage = () => {
  const navigate = useNavigate();
  const [adminKey, setAdminKey] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (
      sessionStorage.getItem(CHAT_SUPPORT_UNLOCK_KEY) === 'true' &&
      sessionStorage.getItem(CHAT_SUPPORT_ADMIN_KEY)
    ) {
      navigate('/chatsupport', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const key = adminKey.trim();
    if (!key) {
      setError('Admin key is required.');
      return;
    }

    setSubmitting(true);
    try {
      await API.post('/auth/verify-support-key', { adminKey: key });
      sessionStorage.setItem(CHAT_SUPPORT_UNLOCK_KEY, 'true');
      sessionStorage.setItem(CHAT_SUPPORT_ADMIN_KEY, key);
      navigate('/chatsupport', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid admin key.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chat-support-unlock-page">
      <div className="chat-support-unlock-card">
        <h1>Chat Support Access</h1>
        <p>Enter admin key to unlock chat support.</p>

        <form onSubmit={handleSubmit} className="chat-support-unlock-form">
          <label htmlFor="chat-support-admin-key">Admin Key</label>
          <div className="chat-support-unlock-input-row">
            <input
              id="chat-support-admin-key"
              type={showKey ? 'text' : 'password'}
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key"
              autoComplete="off"
              disabled={submitting}
            />
            <button
              type="button"
              className="chat-support-unlock-toggle"
              onClick={() => setShowKey((value) => !value)}
              disabled={submitting}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? <div className="chat-support-unlock-error">{error}</div> : null}

          <button type="submit" disabled={submitting || !adminKey.trim()}>
            {submitting ? 'Verifying...' : 'Unlock Chat Support'}
          </button>
        </form>
      </div>
    </div>
  );
};
