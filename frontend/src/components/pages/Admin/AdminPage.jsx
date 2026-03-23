import React, { useEffect, useState } from 'react';
// Debug utility for logging
function debug(...args) {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
import { useAuth } from '../../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [htmlBody, setHtmlBody] = useState('');
  const [inlineStyles, setInlineStyles] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Protect admin route
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Helper to load a script dynamically
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Load legacy admin HTML
  useEffect(() => {
    let mounted = true;

    if (!user?.isAdmin) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Set up globals that legacy JS expects
        if (!window.__apiBase) {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          window.__apiBase = isLocal ? 'http://localhost:5001/api' : window.location.origin + '/api';
        }

        // Ensure a theme is set (light by default)
        if (!document.documentElement.getAttribute('data-theme')) {
          document.documentElement.setAttribute('data-theme', 'light');
        }

        // Fetch admin.html
        const response = await fetch('/admin.html');
        if (!response.ok) throw new Error(`Failed to load admin.html: ${response.status}`);
        
        const text = await response.text();
        if (!mounted) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        // Extract inline <style> tags from legacy HTML
        const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
        setInlineStyles(styles);
        
        // Extract HTML body (without scripts)
        setHtmlBody(doc.body.innerHTML);

        if (!mounted) return;

        // Load required legacy scripts in order (CRITICAL for functionality)
        // These need to load AFTER the HTML is rendered
        debug('[AdminPage] Loading legacy JS files...');
        try {
          await loadScript('/js/api.js');
          debug('[AdminPage] ✓ api.js loaded');
          await loadScript('/js/animations.js');
          debug('[AdminPage] ✓ animations.js loaded');
          await loadScript('/js/markets.js');
          debug('[AdminPage] ✓ markets.js loaded');
          await loadScript('/js/dashboard.js');
          debug('[AdminPage] ✓ dashboard.js loaded');
          await loadScript('/js/portfolio.js');
          debug('[AdminPage] ✓ portfolio.js loaded');
          await loadScript('/js/auth.js');
          debug('[AdminPage] ✓ auth.js loaded');
          await loadScript('/js/testimonies.js');
          debug('[AdminPage] ✓ testimonies.js loaded');
          await loadScript('/js/admin.js');
          debug('[AdminPage] ✓ admin.js loaded');
          await loadScript('/js/theme-switcher.js');
          debug('[AdminPage] ✓ theme-switcher.js loaded');
          debug('[AdminPage] All scripts loaded successfully');
        } catch (scriptErr) {
          debug('[AdminPage] Script loading error:', scriptErr);
          if (mounted) {
            setError(`Failed to load admin scripts: ${scriptErr.message}`);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        debug('Failed to load admin.html:', err);
        if (mounted) {
          setError(`Failed to load legacy admin UI: ${err.message}`);
          setHtmlBody('<div style="padding:24px;color:var(--muted)">Failed to load legacy admin UI. Check console for details.</div>');
          setLoading(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  if (!user?.isAdmin) {
    return null;
  }

  if (error) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)', padding: '24px', color: 'var(--muted)' }}>
        <h2>Admin Panel Error</h2>
        <p>{error}</p>
        <p>Please check the browser console for more details.</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Link the main styles CSS */}
      <link rel="stylesheet" href="/css/styles.css?v=2.0.1" />
      {/* Inject inline styles from legacy HTML */}
      {inlineStyles && <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />}
      {/* Inject legacy HTML body after scripts will eventually load */}
      {!loading && (
        <div className="legacy-admin-wrapper">
          <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
        </div>
      )}
      {loading && <div style={{ padding: '24px', color: 'var(--muted)' }}>Loading admin panel...</div>}
    </div>
  );
};
