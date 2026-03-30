import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './ChatPage.css';
import { getApiBaseUrl, getChatSocketBaseUrl } from '../../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();
const CHAT_SOCKET_BASE_URL = getChatSocketBaseUrl();
const CHAT_SUPPORT_ADMIN_KEY = 'chat_support_admin_key';

const getAdminKey = () => sessionStorage.getItem(CHAT_SUPPORT_ADMIN_KEY) || import.meta.env.VITE_ADMIN_KEY || 'admin-key';

const ChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConversationRef = useRef(null);
  const [isMobileMessagesView, setIsMobileMessagesView] = useState(false); // Track mobile messages view

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Initialize socket connection
  useEffect(() => {
    const adminKey = getAdminKey();

    const newSocket = io(`${CHAT_SOCKET_BASE_URL}/chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: {
        adminKey
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setSocketConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error?.message || 'Socket error occurred');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      setSocket(null);
      setSocketConnected(false);
    };
  }, []);

  // Load all conversations when component mounts
  useEffect(() => {
    loadAllConversations();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message) => {
      const activeId = activeConversationRef.current?.id;
      if (activeId && message.conversation_id === activeId) {
        setMessages(prev => {
          const already = prev.some(m => m.id === message.id);
          if (already) return prev;

          const withoutOptimistic = prev.filter(m => !(m.isOptimistic && m.sender_type === message.sender_type && m.message === message.message));
          return [...withoutOptimistic, message];
        });
      }

      // Update conversation's last message
      setConversations(prev => prev.map(conv =>
        conv.id === message.conversation_id
          ? { ...conv, last_message: message.message, last_sender_type: message.sender_type, last_message_at: message.created_at }
          : conv
      ));
    });

    socket.on('user_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
    };
  }, [socket]);

  // Join/leave conversation room
  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('join_conversation', activeConversation.id);
      loadMessages(activeConversation.id);

      return () => {
        socket.emit('leave_conversation', activeConversation.id);
      };
    }
  }, [socket, activeConversation]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadAllConversations = async () => {
    try {
      // Admin endpoint to get all conversations
      const response = await fetch(`${API_BASE_URL}/api/admin/chat/conversations`, {
        headers: {
          'x-admin-key': getAdminKey()
        }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        // Auto-select the first active conversation
        const activeConv = data.conversations.find(conv => conv.status === 'active');
        if (activeConv) {
          setActiveConversation(activeConv);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chat/conversations/${conversationId}/messages`, {
        headers: {
          'x-admin-key': getAdminKey()
        }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !socket) return;

    const adminId = parseInt(localStorage.getItem('adminId'), 10) || 1; // Use 1 as default admin ID

    const messageData = {
      conversationId: activeConversation.id,
      message: newMessage.trim(),
      senderId: adminId,
      senderType: 'admin'
    };

    // Optimistically add message to UI
    const tempMessage = {
      ...messageData,
      conversation_id: activeConversation.id,
      sender_type: 'admin',
      created_at: new Date().toISOString(),
      sender_name: 'Admin',
      id: `temp-${Date.now()}`,
      isOptimistic: true
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    // Send via socket
    socket.emit('send_message', messageData);
  };

  const handleTyping = () => {
    if (!socket || !activeConversation) return;

    const adminId = parseInt(localStorage.getItem('adminId'), 10) || 1;

    socket.emit('typing_start', {
      conversationId: activeConversation.id,
      userId: adminId.toString(),
      userName: 'Admin'
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', {
        conversationId: activeConversation.id,
        userId: adminId.toString(),
        userName: 'Admin'
      });
    }, 2000);
  };

  const updateConversationStatus = async (conversationId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/chat/conversations/${conversationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': getAdminKey()
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        setConversations(prev => prev.map(conv =>
          conv.id === conversationId ? { ...conv, status } : conv
        ));
        if (activeConversation?.id === conversationId) {
          setActiveConversation(prev => ({ ...prev, status }));
        }
      }
    } catch (error) {
      console.error('Error updating conversation status:', error);
    }
  };

  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
    // On mobile, switch to messages view when conversation is selected
    if (window.innerWidth <= 768) {
      setIsMobileMessagesView(true);
    }
  };

  const handleBackToConversations = () => {
    setIsMobileMessagesView(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'waiting': return '#ffc107';
      case 'closed': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'waiting': return 'Waiting';
      case 'closed': return 'Closed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="admin-chat-page">
      <div className="chat-header">
        <h2>Admin Chat Support</h2>
        <div className="chat-stats">
          <span className="stat">
            Active: {conversations.filter(c => c.status === 'active').length}
          </span>
          <span className="stat">
            Waiting: {conversations.filter(c => c.status === 'waiting').length}
          </span>
          <span className={`stat ${socketConnected ? 'connected' : 'disconnected'}`}>
            Socket: {socketConnected ? '✓ Connected' : '✗ Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button className="close-error" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="chat-content">
        {/* Mobile: Show conversations list or messages based on state */}
        {window.innerWidth <= 768 ? (
          !isMobileMessagesView ? (
            // Mobile conversations view
            <div className="mobile-conversations-view">
              <div className="conversations-list">
                <div className="conversations-header">
                  <h3>All Conversations</h3>
                </div>
                {conversations.length === 0 ? (
                  <div className="no-conversations">
                    <p>No conversations yet.</p>
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleConversationSelect(conv)}
                    >
                      <div className="conversation-info">
                        <div className="conversation-title">
                          <span className="user-name">{conv.user_name || `User ${conv.user_id}`}</span>
                          <span
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(conv.status) }}
                          >
                            {getStatusText(conv.status)}
                          </span>
                        </div>
                        <div className="conversation-preview">
                          {conv.last_message?.substring(0, 40)}...
                        </div>
                        <div className="conversation-meta">
                          <span className="time">
                            {new Date(conv.last_message_at).toLocaleDateString()}
                          </span>
                          {conv.unread_count > 0 && (
                            <span className="unread-count">{conv.unread_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // Mobile messages view
            <div className="mobile-messages-view">
              <div className="mobile-messages-header">
                <button 
                  className="back-btn"
                  onClick={handleBackToConversations}
                  title="Back to conversations"
                >
                  ←
                </button>
                <h4>Chat with {activeConversation?.user_name || `User ${activeConversation?.user_id}`}</h4>
                <div className="conversation-actions">
                  <select
                    value={activeConversation?.status}
                    onChange={(e) => updateConversationStatus(activeConversation.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="waiting">Waiting</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="chat-messages">
                {activeConversation ? (
                  <>
                    <div className="messages-container">
                      {messages.map(msg => (
                        <div
                          key={msg.id || msg.created_at}
                          className={`message ${msg.sender_type === 'admin' ? 'admin-message' : 'user-message'}`}
                        >
                          <div className="message-content">
                            <div className="message-sender">
                              {msg.sender_type === 'admin' ? 'Admin' : activeConversation.user_name || 'User'}
                            </div>
                            <div className="message-text">{msg.message}</div>
                            <div className="message-time">{formatTime(msg.created_at)}</div>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="typing-indicator">
                          <span>User is typing...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {activeConversation.status !== 'closed' && (
                      <div className="mobile-message-input">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') sendMessage();
                            else handleTyping();
                          }}
                          placeholder="Type your response..."
                          disabled={!socket}
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() || !socket}
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-conversation">
                    <p>Select a conversation to start responding.</p>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          // Desktop view: side by side
          <>
            {/* Conversations List */}
            <div className="conversations-list">
              <div className="conversations-header">
                <h3>All Conversations</h3>
              </div>
              {conversations.length === 0 ? (
                <div className="no-conversations">
                  <p>No conversations yet.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                    onClick={() => handleConversationSelect(conv)}
                  >
                    <div className="conversation-info">
                      <div className="conversation-title">
                        <span className="user-name">{conv.user_name || `User ${conv.user_id}`}</span>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(conv.status) }}
                        >
                          {getStatusText(conv.status)}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        {conv.last_message?.substring(0, 40)}...
                      </div>
                      <div className="conversation-meta">
                        <span className="time">
                          {new Date(conv.last_message_at).toLocaleDateString()}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="unread-count">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Chat Messages */}
            <div className="chat-messages">
              {activeConversation ? (
                <>
                  <div className="messages-header">
                    <h4>Chat with {activeConversation.user_name || `User ${activeConversation.user_id}`}</h4>
                    <div className="conversation-actions">
                      <select
                        value={activeConversation.status}
                        onChange={(e) => updateConversationStatus(activeConversation.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="waiting">Waiting</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  <div className="messages-container">
                    {messages.map(msg => (
                      <div
                        key={msg.id || msg.created_at}
                        className={`message ${msg.sender_type === 'admin' ? 'admin-message' : 'user-message'}`}
                      >
                        <div className="message-content">
                          <div className="message-sender">
                            {msg.sender_type === 'admin' ? 'Admin' : activeConversation.user_name || 'User'}
                          </div>
                          <div className="message-text">{msg.message}</div>
                          <div className="message-time">{formatTime(msg.created_at)}</div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="typing-indicator">
                        <span>User is typing...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {activeConversation.status !== 'closed' && (
                    <div className="message-input">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') sendMessage();
                          else handleTyping();
                        }}
                        placeholder="Type your response..."
                        disabled={!socket}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !socket}
                      >
                        Send
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-conversation">
                  <p>Select a conversation to start responding.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatPage;