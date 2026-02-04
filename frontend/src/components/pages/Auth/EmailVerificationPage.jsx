import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import './EmailVerificationPage.css';

export default function EmailVerificationPage() {
  const navigate = useNavigate();
  const { loading } = useApi();
  const [formData, setFormData] = useState({
    email: '',
    code: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to send verification code');
        return;
      }

      setSuccess('Verification code sent to your email!');
      setIsCodeSent(true);
    } catch (err) {
      setError(err.message || 'Network error');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.code.trim()) {
      setError('Verification code is required');
      return;
    }

    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Verification failed');
        return;
      }

      setSuccess('Email verified successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Network error');
    }
  };

  return (
    <div className="verify-container">
      <div className="verify-card">
        <div className="verify-header">
          <div className="verify-icon">✓</div>
          <h1>Verify Email</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={isCodeSent ? handleVerify : handleSendCode} className="verify-form">
          {!isCodeSent ? (
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <p className="form-hint">
                Enter the email address associated with your account
              </p>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>
          ) : (
            <>
              <div className="email-display">
                Verification code sent to <strong>{formData.email}</strong>
              </div>
              <div className="form-group">
                <label htmlFor="code">Verification Code</label>
                <p className="form-hint">Check your email for the 6-digit code</p>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="000000"
                  maxLength="6"
                  required
                />
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsCodeSent(false)}
              >
                Use Different Email
              </button>
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? isCodeSent
                ? 'Verifying...'
                : 'Sending Code...'
              : isCodeSent
                ? 'Verify Email'
                : 'Send Code'}
          </button>
        </form>

        <div className="verify-footer">
          <p>
            Don't see the code? Check your spam folder or{' '}
            <button type="button" className="link-btn">
              resend code
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
