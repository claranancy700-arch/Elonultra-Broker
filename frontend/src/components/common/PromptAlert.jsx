import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import './PromptAlert.css';

export const PromptAlert = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setLoading(true);
        const response = await API.get('/prompts');
        if (response?.data?.prompts) {
          setPrompts(response.data.prompts || []);
        }
      } catch (err) {
        console.error('Failed to load prompts:', err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch on mount
    fetchPrompts();

    // Poll for new prompts every 30 seconds
    const interval = setInterval(fetchPrompts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (promptId) => {
    setDismissed((prev) => ({ ...prev, [promptId]: true }));
    // Mark as read
    API.post(`/prompts/${promptId}/read`).catch(err => console.error('Failed to mark read:', err));
  };

  // Filter out dismissed prompts
  const visiblePrompts = prompts.filter((p) => !dismissed[p.id]);

  if (visiblePrompts.length === 0) return null;

  return (
    <div className="prompts-container">
      {visiblePrompts.map((prompt) => (
        <div key={prompt.id} className="prompt-alert">
          <div className="prompt-icon">📢</div>
          <div className="prompt-content">
            <div className="prompt-message">{prompt.message}</div>
            <div className="prompt-time">
              {new Date(prompt.created_at).toLocaleString()}
            </div>
          </div>
          <button
            className="prompt-close"
            onClick={() => handleDismiss(prompt.id)}
            aria-label="Dismiss prompt"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
