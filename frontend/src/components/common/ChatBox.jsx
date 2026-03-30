import React, { useState, useEffect, useRef, useContext, useCallback, useLayoutEffect } from 'react';
import { io } from 'socket.io-client';
import './ChatBox.css';
import { AuthContext } from '../../context/AuthContext';
import { safeGetItem } from '../../utils/storage';
import { getApiBaseUrl, getChatSocketBaseUrl } from '../../utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();
const CHAT_SOCKET_BASE_URL = getChatSocketBaseUrl();

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
  const [isMobileMessagesView, setIsMobileMessagesView] = useState(false); // Track mobile messages view
  const [isMobile, setIsMobile] = useState(false);

  const { user } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConversationRef = useRef(null);

  // ============ Utility Functions (before effects) ============

  const scrollToBottom = useCallback((instant = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  }, []);

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

  // ============ Socket Management ============

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    const token = safeGetItem('token');
    if (!token || !user) return;

    const newSocket = io(`${CHAT_SOCKET_BASE_URL}/chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { token }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('ChatBox socket connected:', newSocket.id);
      setSocketConnected(true);
      setSocketError(null);
      loadConversations();
    });

    newSocket.on('disconnect', () => {
      console.log('ChatBox socket disconnected');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('ChatBox socket connection error:', error);
      setSocketConnected(false);
      setSocketError('Connection failed. Retrying...');
    });

    newSocket.on('new_message', (message) => {
      const activeConversationId = Number(activeConversationRef.current?.id);
      const messageConversationId = Number(message?.conversation_id);

      if (activeConversationId && messageConversationId && messageConversationId !== activeConversationId) {
        return;
      }

      setMessages(prev => {
        const already = prev.some(m => m.id === message.id);
        if (already) return prev;

        const deduped = prev.filter(m => !(m.isOptimistic && m.sender_type === 'user' && m.message === message.message));
        return [...deduped, message];
      });

      if (message.sender_type === 'admin') {
        setUnreadCount(prev => prev + 1);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      }
      scrollToBottom();
    });

    newSocket.on('conversation_created', (conversation) => {
      setConversations(prev => {
        if (prev.some(c => c.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
      setActiveConversation(conversation);
    });

    newSocket.on('user_typing', (data) => {
      if (data.userName === 'Admin') {
        setIsTyping(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        }
      }
    });

    return () => {
      newSocket.close();
      setSocket(null);
      setSocketConnected(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user]);

  // ============ Message Handling ============

  const sendMessage = async () => {
    if (!validateMessage(newMessage) || !activeConversation || !socket) return;

    const messageData = {
      conversationId: activeConversation.id,
      message: sanitizeMessage(newMessage),
      senderId: user.id,
      senderType: 'user'
    };

    try {
      // Optimistic UI update for instant feedback
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversation.id,
        sender_id: user.id,
        sender_type: 'user',
        message: messageData.message,
        created_at: new Date().toISOString(),
        isOptimistic: true
      };

      setMessages(prev => [...prev, optimisticMessage]);
      socket.emit('send_message', messageData);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startConversation = async () => {
    if (!user) return;

    try {
      const token = safeGetItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: 'Hello, I need help with my account.'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.success) {
        setActiveConversation(data.conversation);
        setConversations(prev => [data.conversation, ...prev]);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  // ============ UI Handlers ============

  const selectConversation = (conversation) => {
    if (!conversation) return;

    // leave previous conversation if set
    if (socket && activeConversation?.id && activeConversation.id !== conversation.id) {
      socket.emit('leave_conversation', activeConversation.id);
    }

    setActiveConversation(conversation);
    setUnreadCount(0);

    if (socket) {
      socket.emit('join_conversation', conversation.id);
    }
  };

  useEffect(() => {
    if (!socket || !activeConversation?.id) return;

    socket.emit('join_conversation', activeConversation.id);

    return () => {
      if (socket && activeConversation?.id) {
        socket.emit('leave_conversation', activeConversation.id);
      }
    };
  }, [socket, activeConversation]);

  const toggleMobileView = () => {
    setIsMobileMessagesView(!isMobileMessagesView);
  };

  // ============ Effects ============

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation]);

  useLayoutEffect(() => {
    if (!isOpen || !activeConversation) return;
    scrollToBottom(true);
  }, [isOpen, activeConversation, messages, isTyping, scrollToBottom]);

  // ============ Render ============

  if (!isOpen) return null;

  return (
    <div className="chatbox-overlay" onClick={onClose}>
      <div className="chatbox-container" onClick={(e) => e.stopPropagation()}>
        <div className="chatbox-header">
          <h3>Live Support Chat</h3>
          <button className="chatbox-close" onClick={onClose}>×</button>
        </div>

        <div className="chatbox-content">
          {!activeConversation ? (
            <div className="chatbox-start">
              <div className="chatbox-welcome">
                <h4>Welcome to Live Support</h4>
                <p>Get instant help from our support team</p>
                <button
                  type="button"
                  className="chatbox-start-btn"
                  onClick={startConversation}
                  disabled={!socketConnected}
                >
                  {socketConnected ? 'Start Chat' : 'Connecting...'}
                </button>
                {!socketConnected && (
                  <p className="chatbox-status">
                    {socketError || 'Connecting to chat...'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="chatbox-messages" ref={messagesContainerRef}>
                {messages.map((message, index) => (
                  <div
                    key={message.id || `${message.created_at}-${index}`}
                    className={`chatbox-message ${message.sender_type === 'user' ? 'user' : 'admin'}`}
                  >
                    <div className="chatbox-message-content">
                      {message.message}
                    </div>
                    <div className="chatbox-message-time">
                      {formatTime(message.created_at)}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="chatbox-message admin typing">
                    <div className="chatbox-message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chatbox-input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  maxLength={1000}
                  disabled={!socketConnected}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!validateMessage(newMessage) || !socketConnected}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>

        {showNotification && (
          <div className="chatbox-notification">
            New message received!
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBox;