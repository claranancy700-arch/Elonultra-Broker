import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import './ProAdminPage.css';

export const ProAdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [htmlBody, setHtmlBody] = useState('');
  const [inlineStyles, setInlineStyles] = useState('');
  const [loading, setLoading] = useState(true);

  // Protect pro-admin route
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load legacy PRO-admin HTML
  useEffect(() => {
    let mounted = true;

    if (!user?.isAdmin) {
      setLoading(false);
      return;
    }

    // Set up globals that legacy JS expects
    if (!window.__apiBase) {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      window.__apiBase = isLocal ? 'http://localhost:5001/api' : window.location.origin + '/api';
    }

    // Ensure dark theme is set
    if (!document.documentElement.getAttribute('data-theme')) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    fetch('/PRO-admin.html')
      .then(r => r.text())
      .then(text => {
        if (!mounted) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        // Extract inline <style> tags from legacy HTML
        const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
        setInlineStyles(styles);
        setHtmlBody(doc.body.innerHTML);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load PRO-admin.html:', err);
        if (mounted) {
          setHtmlBody('<div style="padding:24px;color:var(--muted)">Failed to load legacy PRO-admin UI. Check console for details.</div>');
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [user]);

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Link the pro-admin styles CSS */}
      <link rel="stylesheet" href="/css/pro-admin.css" />
      {/* Inject inline styles from legacy HTML */}
      {inlineStyles && <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />}
      {/* Inject legacy HTML body */}
      <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
    </div>
  );
};
