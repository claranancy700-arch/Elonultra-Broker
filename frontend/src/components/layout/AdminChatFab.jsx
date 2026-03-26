import React, { useState } from 'react';
import './AdminChatFab.css';

/**
 * AdminChatFab Component
 * 
 * Floating Action Button exclusive for admin users to access the admin chat dashboard.
 * Only displays when user is authenticated as an admin.
 * 
 * @param {boolean} isAdmin - Whether the current user has admin privileges
 * @param {function} onNavigate - Callback function to navigate to admin chat (router push)
 */
export const AdminChatFab = ({ isAdmin, onNavigate }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-chat-fab-wrapper">
      <button
        className="admin-chat-fab"
        onClick={onNavigate}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title="Go to Admin Chat Dashboard"
        aria-label="Admin Chat Dashboard"
      >
        <span className="admin-icon">👨‍💼</span>
      </button>
      
      {showTooltip && (
        <div className="admin-fab-tooltip">
          Admin Chat
        </div>
      )}
    </div>
  );
};

export default AdminChatFab;
