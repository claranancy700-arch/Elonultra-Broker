import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import './ChatBox.css';
import { AuthContext } from '../../context/AuthContext';
import { safeGetItem } from '../../utils/storage';

const API_BASE_URL = 'http://localhost:5001';

const ChatBox = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const socketRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ============ Utility Functions (before effects) ============

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sanitizeMessage = (message) => {
    // Basic sanitization - remove potentially harmful content
    return message
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .substring(0, 1000); // Limit message length
  };

  const validateMessage = (message) => {
    const sanitized = sanitizeMessage(message);
    return sanitized.length > 0 && sanitized.length <= 1000;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const loadConversations = async (attempt = 1) => {
    try {
      const token = safeGetItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !activeConversation) {
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
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`, {
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
    const sanitizedMessage = sanitizeMessage(newMessage);
    if (!validateMessage(sanitizedMessage)) {
      alert('Message must be between 1-1000 characters and contain valid content.');
      return;
    }

    if (!user) {
      setError('You must be logged in to start a chat');
      return;
    }

    setIsLoading(true);
    try {
      const token = safeGetItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: sanitizedMessage })
      });
      const data = await response.json();
      if (data.success) {
        setConversations(prev => [data.conversation, ...prev]);
        setActiveConversation(data.conversation);
        setNewMessage('');
        setUnreadCount(0); // Reset unread count when opening chat
        // Join the new conversation room (will happen in useEffect when socket is ready)
        // if (socket) {
        //   socket.emit('join_conversation', data.conversation.id);
        // }
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    const sanitizedMessage = sanitizeMessage(newMessage);
    if (!validateMessage(sanitizedMessage) || !activeConversation) return;

    const activeSocket = socket || socketRef.current;
    // Don't send if socket is not ready
    if (!activeSocket) {
      console.warn('Socket not ready, message not sent');
      return;
    }

    if (!user) {
      console.error('No user context found - user not logged in');
      return;
    }

    const messageData = {
      conversationId: activeConversation.id,
      message: sanitizedMessage,
      senderId: user.id,
      senderType: 'user'
    };

    // Optimistically add message to UI
    const tempMessage = {
      ...messageData,
      created_at: new Date().toISOString(),
      sender_name: 'You',
      id: Date.now() // Temporary ID
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    // Send via socket
    activeSocket.emit('send_message', messageData);
  };

  const handleTyping = () => {
    const activeSocket = socket || socketRef.current;
    if (!activeSocket || !activeConversation) return;

    activeSocket.emit('typing_start', {
      conversationId: activeConversation.id,
      userId: localStorage.getItem('userId'),
      userName: localStorage.getItem('userName') || 'User'
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      activeSocket.emit('typing_stop', {
        conversationId: activeConversation.id,
        userId: localStorage.getItem('userId'),
        userName: localStorage.getItem('userName') || 'User'
      });
    }, 2000);
  };

  // ============ useEffect Hooks ============

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(`${API_BASE_URL}/chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('ChatBox socket connected:', newSocket.id);
      setSocketConnected(true);
      setSocketError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('ChatBox socket disconnected:', reason);
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('ChatBox socket connection error:', err);
      setSocketError(err.message || 'Socket connection failed');
      setSocketConnected(false);
    });

    newSocket.on('error', (err) => {
      console.error('ChatBox socket error:', err);
      setSocketError(err.message || 'Socket error');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
      socketRef.current = null;
      setSocket(null);
      setSocketConnected(false);
    };
  }, []);

  // Load conversations when chat opens
  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  // Socket event listeners
  useEffect(() => {
    const activeSocket = socket || socketRef.current;
    if (!activeSocket) return;

    activeSocket.on('new_message', (message) => {
      // Only show notification if chat is not currently open or message is from admin
      if (!isOpen || message.sender_type === 'admin') {
        setUnreadCount(prev => prev + 1);
        setShowNotification(true);
        // Auto-hide notification after 5 seconds
        setTimeout(() => setShowNotification(false), 5000);
      }
      
      setMessages(prev => [...prev, message]);
      // Update conversation's last message
      setConversations(prev => prev.map(conv =>
        conv.id === message.conversation_id
          ? { ...conv, last_message: message.message, last_sender_type: message.sender_type, last_message_at: message.created_at }
          : conv
      ));
    });

    activeSocket.on('user_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    return () => {
      activeSocket.off('new_message');
      activeSocket.off('user_typing');
    };
  }, [socket, isOpen]); // Keep both dependencies but socket should be stable now

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

  if (!isOpen) return null;

  return (
    <>
      {socketError && (
        <div className="chat-connection-warning">
          <small>Chat connection issue: {socketError}. Retrying automatically.</small>
        </div>
      )}
      {!socketConnected && !socketError && (
        <div className="chat-connection-info">
          <small>Attempting to connect to chat server...</small>
        </div>
      )}

    
      {/* Notification for new messages */}
      {showNotification && unreadCount > 0 && (
        <div className="chat-notification">
          <div className="notification-content">
            <span className="notification-icon">💬</span>
            <span className="notification-text">
              {unreadCount} new message{unreadCount > 1 ? 's' : ''} from support
            </span>
            <button 
              className="notification-close"
              onClick={() => setShowNotification(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="chat-overlay">
        <div className="chat-container">
        <div className="chat-header">
          <h3>Live Support Chat</h3>
          <button className="chat-close" onClick={onClose}>×</button>
        </div>

        <div className="chat-content">
          {/* Conversations List */}
          <div className="conversations-list">
            <div className="conversations-header">
              <h4>Your Conversations</h4>
              {conversations.length === 0 && (
                <p className="no-conversations">No conversations yet. Start chatting below!</p>
              )}
            </div>
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${activeConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => setActiveConversation(conv)}
              >
                <div className="conversation-info">
                  <div className="conversation-title">
                    Conversation #{conv.id}
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                  <div className="conversation-preview">
                    {conv.last_message?.substring(0, 50)}...
                  </div>
                </div>
                <div className="conversation-time">
                  {new Date(conv.last_message_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {activeConversation ? (
              <>
                <div className="messages-container">
                  {messages.map(msg => (
                    <div
                      key={msg.id || msg.created_at}
                      className={`message ${msg.sender_type === 'user' ? 'user-message' : 'admin-message'}`}
                    >
                      <div className="message-content">
                        <div className="message-text">{msg.message}</div>
                        <div className="message-time">{formatTime(msg.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="typing-indicator">
                      <span>Admin is typing...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="message-input">
                  {!user ? (
                    <div className="auth-required-notice">
                      <small>Please log in to send messages</small>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') sendMessage();
                          else handleTyping();
                        }}
                        placeholder="Type your message..."
                        disabled={!socket}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || !socket}
                      >
                        Send
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="no-conversation">
                <p>Select a conversation or start a new one below.</p>
              </div>
            )}
          </div>
        </div>

        {/* New Conversation */}
        {conversations.length === 0 && (
          <div className="new-conversation">
            {!user ? (
              <div className="auth-required-notice">
                <small>Please log in to start a chat</small>
              </div>
            ) : (
              <>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={3}
                />
                <button
                  onClick={createNewConversation}
                  disabled={!newMessage.trim() || isLoading}
                >
                  {isLoading ? 'Starting...' : 'Start Chat'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default ChatBox;