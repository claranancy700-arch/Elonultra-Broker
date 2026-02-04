import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import API from '../../../services/api';
import './ProAdminPage.css';

export const ProAdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('advanced');
  const [loading, setLoading] = useState(false);

  // Protect pro-admin route
  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  // For quick testing of legacy PRO-admin UI, render PRO-admin.html inside an iframe.
  if (!user?.isAdmin) {
    useEffect(() => { navigate('/dashboard'); }, [navigate]);
    return null;  
  }
  const [htmlBody, setHtmlBody] = React.useState('');
  const [inlineStyles, setInlineStyles] = React.useState('');

  React.useEffect(() => {
    let mounted = true;
    fetch('/PRO-admin.html')
      .then(r => r.text())
      .then(text => {
        if (!mounted) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
        setInlineStyles(styles);
        setHtmlBody(doc.body.innerHTML);
      })
      .catch(() => {
        if (mounted) setHtmlBody('<div style="padding:24px;color:var(--muted)">Failed to load legacy PRO-admin UI.</div>');
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
