import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import './AdminPage.css';

export const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (!user?.isAdmin) return null;
  const [htmlBody, setHtmlBody] = React.useState('');
  const [inlineStyles, setInlineStyles] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    fetch('/admin.html')
      .then(r => r.text())
      .then(text => {
        if (!mounted) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        // extract inline <style> tags
        const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
        setInlineStyles(styles);
        setHtmlBody(doc.body.innerHTML);
      })
      .catch(() => {
        if (mounted) setHtmlBody('<div style="padding:24px;color:var(--muted)">Failed to load legacy admin UI.</div>');
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ width: '100%' }}>
      {inlineStyles && <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />}
      <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
    </div>
  );
};
