import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import './LoginPage.css';

export const LoginPage = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { request, loading } = useApi();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in (wait until auth loading completes)
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Call login API
      const response = await request('POST', '/auth/login', {
        email: email.trim(),
        password,
      });

      // Check response structure
      if (response && response.user && response.token) {
        // Update auth context with user data and token
        login(response.user, response.token);
        // Navigation happens automatically via useEffect when user is set
      } else if (response && response.id) {
        // If response is directly the user object
        login(response, response.token || response.refreshToken);
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      const errorMsg = 
        err.response?.data?.message || 
        err.response?.data?.error ||
        err.message || 
        'Login failed. Please try again.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = email.trim() && password && !isSubmitting;

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>ELON-ULTRA</h1>
            <p className="login-subtitle">Login to your account</p>
          </div>

          {error && (
            <div className="error-banner">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isSubmitting}
                autoComplete="email"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="form-input"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="login-button"
            >
              {isSubmitting || loading ? (
                <>
                  <span className="spinner"></span>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="login-links">
              <a href="#forgot-password" className="forgot-link">Forgot password?</a>
              <span className="separator">•</span>
              <a href="/signup" className="signup-link">Don't have an account?</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
