import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import './PromptAlert.css';

export const PromptAlert = () => {
  const [prompts, setPrompts] = useState([]);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    // Non-blocking fetch - use timeout to defer execution
    const timer = setTimeout(() => {
      API.get('/prompts')
        .then(response => {
          if (response?.data?.prompts && Array.isArray(response.data.prompts)) {
            setPrompts(response.data.prompts);
          }
        })
        .catch(() => {
          // Silently ignore errors
        });
    }, 500); // Delay by 500ms to not block initial render

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (promptId) => {
    setDismissed((prev) => ({ ...prev, [promptId]: true }));
  };

  // Auto-dismiss prompts after 30 seconds
  useEffect(() => {
    const timers = prompts.map((prompt) => {
      if (dismissed[prompt.id]) return null;
      return setTimeout(() => handleDismiss(prompt.id), 30000);
    });
    return () => timers.forEach((timer) => timer && clearTimeout(timer));
  }, [prompts, dismissed]);

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
