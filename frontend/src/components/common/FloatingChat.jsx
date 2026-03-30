import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import './FloatingChat.css';
import { AuthContext } from '../../context/AuthContext';
import { safeGetItem } from '../../utils/storage';
import { getApiBaseUrl } from '../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

export const FloatingChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isMobileMessagesView, setIsMobileMessagesView] = useState(false); // Track mobile messages view
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(`${API_BASE_URL}/chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('FloatingChat socket connected:', newSocket.id);
      setSocketConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('FloatingChat socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('FloatingChat socket connection error:', error);
      setSocketConnected(false);
      setError('Chat connection failed. Retrying...');
    });

    newSocket.on('error', (error) => {
      console.error('FloatingChat socket error:', error);
      setError(error?.message || 'Chat error occurred');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      setSocket(null);
      setSocketConnected(false);
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
      if (message.sender_type !== 'user') {
        setUnreadCount(prev => prev + 1);
      }
      setConversations(prev => prev.map(conv =>
        conv.id === message.conversation_id
          ? { 
              ...conv, 
              last_message: message.message, 
              last_sender_type: message.sender_type,
              last_message_at: message.created_at,
              unread_count: message.sender_type !== 'user' ? (conv.unread_count || 0) + 1 : conv.unread_count
            }
          : conv
      ));
    });

    socket.on('conversation_created', (conversation) => {
      setConversations(prev => [conversation, ...prev]);
    });

    socket.on('user_typing', (data) => {
      if (data.senderType === 'admin') {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('conversation_created');
      socket.off('user_typing');
    };
  }, [socket]);

  // Load active conversation messages
  useEffect(() => {
    if (socket && activeConversation) {
      socket.emit('join_conversation', activeConversation.id);
      loadMessages(activeConversation.id);
      setUnreadCount(0);
      setConversations(prev => prev.map(conv =>
        conv.id === activeConversation.id 
          ? { ...conv, unread_count: 0 }
          : conv
      ));

      return () => {
        socket.emit('leave_conversation', activeConversation.id);
      };
    }
  }, [socket, activeConversation]);

  // Update body class for mobile chat state - full screen on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth <= 768) {
      document.body.classList.add('mobile-chat-fullscreen');
    } else {
      document.body.classList.remove('mobile-chat-fullscreen');
    }

    return () => {
      document.body.classList.remove('mobile-chat-fullscreen');
    };
  }, [isOpen]);

  const loadConversations = async (attempt = 1) => {
    try {
      const token = safeGetItem('token');
      if (!token) return;

      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        const unreadConv = data.conversations.find(c => c.unread_count > 0);
        if (unreadConv) {
          setActiveConversation(unreadConv);
        } else if (data.conversations.length > 0) {
          setActiveConversation(data.conversations[0]);
        }
      }
    } catch (error) {
      console.error(`Error loading conversations (attempt ${attempt}):`, error);
      if (attempt < 5) {
        const wait = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        setTimeout(() => loadConversations(attempt + 1), wait);
      }
    }
  };

  const loadMessages = async (conversationId, attempt = 1) => {
    if (!conversationId) return;

    try {
      const token = safeGetItem('token');
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error(`Error loading messages (attempt ${attempt}):`, error);
      if (attempt < 5) {
        const wait = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
        setTimeout(() => loadMessages(conversationId, attempt + 1), wait);
      }
    }
  };

  const createNewConversation = async () => {
    if (!newMessage.trim()) return;

    if (!user) {
      setError('You must be logged in to start a chat');
      return;
    }

    const token = safeGetItem('token');
    if (!token) {
      setError('You must be logged in to start a chat');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: newMessage.trim()
        })
      });
      const data = await response.json();
      if (data.success) {
        const newConv = data.conversation;
        setConversations(prev => [newConv, ...prev]);
        setActiveConversation(newConv);
        setMessages([]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !socket) return;

    if (!user || !user.id) {
      console.error('No user context found - user not logged in');
      return;
    }

    const messageData = {
      conversationId: activeConversation.id,
      message: newMessage.trim(),
      senderId: user.id,
      senderType: 'user'
    };

    console.log('FloatingChat sending message:', messageData);

    // Optimistically add message
    setMessages(prev => [...prev, {
      ...messageData,
      created_at: new Date().toISOString(),
      id: Date.now()
    }]);
    setNewMessage('');

    // Send via socket
    socket.emit('send_message', messageData);
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
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = formatDate(msg.created_at);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const getAvatarInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) {
    return (
      <button 
        className="floating-chat-fab"
        onClick={() => setIsOpen(true)}
        title="Open chat"
      >
        <span className="chat-icon">💬</span>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </button>
    );
  }

  return (
    <div className="floating-chat-container">
      <div className="floating-chat-header">
        <div>
          <h4>Support Chat</h4>
          {socketConnected && (
            <div className="header-status">
              <span className="status-dot"></span>
              <span>Online</span>
            </div>
          )}
        </div>
        <button 
          className="close-btn"
          onClick={() => setIsOpen(false)}
          title="Close chat"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="chat-error-banner">
          <small>{error}</small>
        </div>
      )}

      <div className="floating-chat-content">
        {!user ? (
          <div className="auth-required-message">
            <p>Please log in to use the chat feature.</p>
            <small>Support chat requires authentication to ensure secure communication.</small>
          </div>
        ) : conversations.length === 0 ? (
          <div className="new-conversation-form">
            <div className="start-chat-section">
              <button
                onClick={createNewConversation}
                disabled={!newMessage.trim() || isLoading}
                className="start-chat-btn"
              >
                {isLoading ? 'Starting...' : 'Start Chat'}
              </button>
            </div>
            <div className="message-input-section">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe your issue..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Mobile: Show conversations list or messages based on state */}
            {window.innerWidth <= 768 ? (
              !isMobileMessagesView ? (
                // Mobile conversations view
                <div className="mobile-conversations-view">
                  <div className="conversations-sidebar">
                    {conversations.map(conv => (
                      <div
                        key={conv.id}
                        className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                        onClick={() => handleConversationSelect(conv)}
                      >
                        <div className="conv-title">
                          {conv.subject || `Chat ${conv.id}`}
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="unread-indicator">{conv.unread_count}</span>
                        )}
                      </div>
                    ))}
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
                    <h4>{activeConversation?.subject || `Chat ${activeConversation?.id}`}</h4>
                  </div>
                  <div className="messages-area">
                    {activeConversation ? (
                      <>
                        <div className="chat-messages-container">
                          {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
                            <div key={date}>
                              <div className="timestamp-separator">
                                {date}
                              </div>
                              {msgs.map(msg => (
                                <div 
                                  key={msg.id} 
                                  className={`message ${msg.sender_type === 'admin' ? 'admin' : 'user'}`}
                                >
                                  {msg.sender_type === 'admin' && (
                                    <div className={`message-avatar admin`}>
                                      {getAvatarInitials(msg.sender_name || 'Admin')}
                                    </div>
                                  )}
                                  <div className="message-content">
                                    <div className="message-bubble">
                                      {msg.message}
                                    </div>
                                    <div className="message-time">
                                      {formatTime(msg.created_at)}
                                    </div>
                                  </div>
                                  {msg.sender_type === 'user' && (
                                    <div className={`message-avatar user`}>
                                      {getAvatarInitials(user?.name || 'You')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                          {isTyping && (
                            <div className="message admin">
                              <div className="message-avatar admin">A</div>
                              <div className="message-content">
                                <div className="typing-indicator">
                                  <div className="typing-dot"></div>
                                  <div className="typing-dot"></div>
                                  <div className="typing-dot"></div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Mobile input area positioned at bottom */}
                        <div className="mobile-chat-input-area">
                          <div className="input-container">
                            <div className="message-input-wrapper">
                              <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                  }
                                }}
                                placeholder="Type a message... (Shift+Enter for new line)"
                                disabled={!socket}
                                rows={1}
                              />
                              <button 
                                className="emoji-btn"
                                title="Emoji (coming soon)"
                                type="button"
                              >
                                😊
                              </button>
                            </div>
                            <button
                              className="send-btn"
                              onClick={sendMessage}
                              disabled={!socket || !newMessage.trim()}
                              title="Send message"
                            >
                              ↗️
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="no-conversation">
                        <p>Select a conversation</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              // Desktop view: side by side
              <>
                <div className="conversations-sidebar">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                      onClick={() => handleConversationSelect(conv)}
                    >
                      <div className="conv-title">
                        {conv.subject || `Chat ${conv.id}`}
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="unread-indicator">{conv.unread_count}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="messages-area">
                  {activeConversation ? (
                    <>
                      <div className="chat-messages-container">
                        {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
                          <div key={date}>
                            <div className="timestamp-separator">
                              {date}
                            </div>
                            {msgs.map(msg => (
                              <div 
                                key={msg.id} 
                                className={`message ${msg.sender_type === 'admin' ? 'admin' : 'user'}`}
                              >
                                {msg.sender_type === 'admin' && (
                                  <div className={`message-avatar admin`}>
                                    {getAvatarInitials(msg.sender_name || 'Admin')}
                                  </div>
                                )}
                                <div className="message-content">
                                  <div className="message-bubble">
                                    {msg.message}
                                  </div>
                                  <div className="message-time">
                                    {formatTime(msg.created_at)}
                                  </div>
                                </div>
                                {msg.sender_type === 'user' && (
                                  <div className={`message-avatar user`}>
                                    {getAvatarInitials(user?.name || 'You')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                        {isTyping && (
                          <div className="message admin">
                            <div className="message-avatar admin">A</div>
                            <div className="message-content">
                              <div className="typing-indicator">
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      <div className="floating-chat-input-area">
                        <div className="input-container">
                          <div className="message-input-wrapper">
                            <textarea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  sendMessage();
                                }
                              }}
                              placeholder="Type a message... (Shift+Enter for new line)"
                              disabled={!socket}
                              rows={1}
                            />
                            <button 
                              className="emoji-btn"
                              title="Emoji (coming soon)"
                              type="button"
                            >
                              😊
                            </button>
                          </div>
                          <button
                            className="send-btn"
                            onClick={sendMessage}
                            disabled={!socket || !newMessage.trim()}
                            title="Send message"
                          >
                            ↗️
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-conversation">
                      <p>Select a conversation</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingChat;
