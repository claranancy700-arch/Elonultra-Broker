import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getApiBaseUrl, getChatSocketBaseUrl } from '../../../utils/apiConfig';
import './ChatSupportPage.css';

const CHAT_SUPPORT_UNLOCK_KEY = 'chat_support_unlocked';
const CHAT_SUPPORT_ADMIN_KEY = 'chat_support_admin_key';
const API_BASE_URL = getApiBaseUrl();
const CHAT_SOCKET_BASE_URL = getChatSocketBaseUrl();

export const ChatSupportPage = () => {
  const navigate = useNavigate();
  const unlocked = sessionStorage.getItem(CHAT_SUPPORT_UNLOCK_KEY) === 'true';
  const adminKey = sessionStorage.getItem(CHAT_SUPPORT_ADMIN_KEY) || '';
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesListRef = useRef(null);
  const optimisticMessageIdRef = useRef(null);
  const activeConversationRef = useRef(null);
  const activeConversationId = activeConversation?.id || null;

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Hide bottom nav on this full-page view
  useEffect(() => {
    document.body.classList.add('chat-support-view');
    return () => document.body.classList.remove('chat-support-view');
  }, []);

  const scrollToLatestMessage = useCallback(() => {
    if (!messagesListRef.current) return;
    messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
  }, []);

  const requestJson = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'x-admin-key': adminKey
      }
    });

    const rawText = await response.text();
    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!response.ok || !data?.success) {
      throw new Error(
        data?.error || data?.message || `Request failed with status ${response.status}`
      );
    }

    return data;
  }, [adminKey]);

  const fetchConversations = useCallback(async ({ silent = false } = {}) => {
    if (!adminKey) return;

    try {
      setError('');
      if (!silent) {
        setIsLoadingConversations(true);
      }
      const data = await requestJson('/api/admin/chat/conversations');

      const nextConversations = data.conversations || [];
      setConversations(nextConversations);

      setActiveConversation((currentConversation) => {
        if (!nextConversations.length) {
          return null;
        }

        if (!currentConversation) {
          return null;
        }

        return (
          nextConversations.find((conversation) => conversation.id === currentConversation.id) ||
          null
        );
      });
    } catch (err) {
      setError(err?.message || 'Failed to load conversations');
    } finally {
      if (!silent) {
        setIsLoadingConversations(false);
      }
    }
  }, [adminKey, requestJson]);

  useEffect(() => {
    if (!unlocked || !adminKey) return undefined;

    const newSocket = io(`${CHAT_SOCKET_BASE_URL}/chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { adminKey }
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
      setError('');
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    newSocket.on('connect_error', () => {
      setSocketConnected(false);
    });

    newSocket.on('new_message', (message) => {
      const activeId = Number(activeConversationRef.current?.id || 0);
      const messageConversationId = Number(message?.conversation_id || 0);

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === messageConversationId
            ? {
                ...conversation,
                last_message: message.message,
                last_sender_type: message.sender_type,
                last_message_at: message.created_at,
                updated_at: message.created_at
              }
            : conversation
        )
      );

      if (!activeId || activeId !== messageConversationId) return;

      setMessages((prev) => {
        const hasSameId = prev.some((msg) => msg.id === message.id);
        if (hasSameId) return prev;

        const withoutOptimistic = prev.filter(
          (msg) => !(msg.isOptimistic && msg.sender_type === message.sender_type && msg.message === message.message)
        );

        return [...withoutOptimistic, message];
      });
    });

    newSocket.on('message_error', (payload) => {
      if (optimisticMessageIdRef.current) {
        const optimisticId = optimisticMessageIdRef.current;
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      }
      setError(payload?.error || 'Failed to send message');
      setSending(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      setSocket(null);
      setSocketConnected(false);
    };
  }, [adminKey, unlocked]);

  const fetchMessages = useCallback(async (conversationId, { silent = false } = {}) => {
    if (!conversationId || !adminKey) return;

    try {
      setError('');
      if (!silent) {
        setIsLoadingMessages(true);
      }
      const data = await requestJson(
        `/api/admin/chat/conversations/${conversationId}/messages`
      );

      setMessages(data.messages || []);
    } catch (err) {
      setError(err?.message || 'Failed to load messages');
    } finally {
      if (!silent) {
        setIsLoadingMessages(false);
      }
    }
  }, [adminKey, requestJson]);

  useEffect(() => {
    if (!unlocked || !adminKey) return;
    fetchConversations();
  }, [adminKey, fetchConversations, unlocked]);

  useEffect(() => {
    if (!unlocked || !adminKey) return;

    if (activeConversationId) {
      fetchMessages(activeConversationId, { silent: false });
    } else {
      setMessages([]);
    }
  }, [activeConversationId, adminKey, fetchMessages, unlocked]);

  useEffect(() => {
    if (!socket || !activeConversationId) return undefined;

    socket.emit('join_conversation', activeConversationId);

    return () => {
      socket.emit('leave_conversation', activeConversationId);
    };
  }, [socket, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return undefined;

    const interval = setInterval(() => {
      if (!socketConnected) {
        fetchMessages(activeConversationId, { silent: true });
      }
      fetchConversations({ silent: true });
    }, 12000);

    return () => clearInterval(interval);
  }, [activeConversationId, fetchConversations, fetchMessages]);

  useEffect(() => {
    if (!activeConversationId) return;
    scrollToLatestMessage();
  }, [activeConversationId, messages, scrollToLatestMessage]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversation?.id || !messageText.trim() || sending) return;

    const trimmedMessage = messageText.trim();
    const optimisticId = `temp-${Date.now()}`;
    optimisticMessageIdRef.current = optimisticId;

    // Optimistic append so sending feels instant and does not "reload" the panel.
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        sender_type: 'admin',
        sender_name: 'Support',
        message: trimmedMessage,
        created_at: new Date().toISOString(),
        isOptimistic: true
      }
    ]);
    setMessageText('');

    setSending(true);
    setError('');
    try {
      if (socket && socketConnected) {
        socket.emit('send_message', {
          conversationId: activeConversation.id,
          message: trimmedMessage,
          senderId: 1,
          senderType: 'admin'
        });
      } else {
        const data = await requestJson(
          `/api/admin/chat/conversations/${activeConversation.id}/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: trimmedMessage,
              adminId: 1
            })
          }
        );

        // Replace optimistic message with server message when available.
        if (data?.message) {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === optimisticId ? data.message : msg))
          );
        }
      }

      // Keep UI instant: avoid immediate message refetch (it can briefly drop the just-sent
      // message on slow backends). Sync continues via periodic silent polling.
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                last_message: trimmedMessage,
                last_sender_type: 'admin',
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            : conversation
        )
      );

      fetchConversations({ silent: true });
    } catch (err) {
      // Roll back optimistic message on failure.
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      setMessageText(trimmedMessage);
      setError(err?.message || 'Failed to send message');
    } finally {
      optimisticMessageIdRef.current = null;
      setSending(false);
    }
  };

  const formatTime = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!unlocked || !adminKey) {
    return <Navigate to="/chat-support-unlock" replace />;
  }

  const getInitial = (name) => (name || '?')[0].toUpperCase();

  return (
    <div className="cs-page">
      {/* â”€â”€ TOP BAR â”€â”€ */}
      <header className="cs-topbar">
        <div className="cs-topbar-left">
          {/* Mobile: menu or back button */}
          {activeConversation ? (
            <button
              type="button"
              className="cs-mobile-back"
              onClick={() => { setActiveConversation(null); setMessages([]); setMessageText(''); }}
              aria-label="Back to conversations"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          ) : null}

          <div className="cs-topbar-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <h1>Support Chat</h1>
          <span className={`cs-status-dot ${socketConnected ? 'online' : ''}`} style={{ marginLeft: 6 }} />
          <span className="cs-status-label">{socketConnected ? 'Live' : 'Polling'}</span>
        </div>

        <button
          type="button"
          className="cs-lock-btn"
          onClick={() => {
            sessionStorage.removeItem(CHAT_SUPPORT_UNLOCK_KEY);
            sessionStorage.removeItem(CHAT_SUPPORT_ADMIN_KEY);
            navigate('/chat-support-unlock', { replace: true });
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
          Lock
        </button>
      </header>

      {/* â”€â”€ BODY â”€â”€ */}
      <div className="cs-body">
        {/* â”€â”€ SIDEBAR â”€â”€ */}
        <aside className={`cs-sidebar${!activeConversation ? ' open' : ''}`}>
          <div className="cs-sidebar-head">
            <div className="cs-sidebar-title">Conversations</div>
          </div>
          <div className="cs-conv-list">
            {isLoadingConversations ? (
              <div className="cs-empty">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="cs-empty">No conversations yet.</div>
            ) : (
              conversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  className={`cs-conv-item${activeConversation?.id === conv.id ? ' active' : ''}`}
                  onClick={() => { setActiveConversation(conv); setMessageText(''); }}
                >
                  <div className="cs-conv-avatar">{getInitial(conv.user_name)}</div>
                  <div className="cs-conv-info">
                    <div className="cs-conv-name">{conv.user_name || `User ${conv.user_id}`}</div>
                    <div className="cs-conv-preview">
                      {conv.last_message ? (conv.last_sender_type === 'admin' ? 'You: ' : '') + conv.last_message : 'No messages'}
                    </div>
                  </div>
                  <div className="cs-conv-time">{formatTime(conv.last_message_at || conv.updated_at)}</div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* â”€â”€ MAIN PANEL â”€â”€ */}
        <main className="cs-main">
          {error ? <div className="cs-error">{error}</div> : null}

          {!activeConversation ? (
            <div className="cs-placeholder">
              <div className="cs-placeholder-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <p>Select a conversation to start replying</p>
            </div>
          ) : (
            <>
              {/* Message header */}
              <div className="cs-msg-header">
                <div className="cs-msg-avatar">{getInitial(activeConversation.user_name)}</div>
                <div className="cs-msg-user">
                  <div className="cs-msg-user-name">{activeConversation.user_name || `User ${activeConversation.user_id}`}</div>
                  <div className="cs-msg-user-sub">Conversation #{activeConversation.id}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="cs-messages" ref={messagesListRef}>
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="cs-empty" style={{ textAlign: 'center' }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="cs-empty" style={{ textAlign: 'center' }}>No messages yet.</div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin';
                    return (
                      <div key={msg.id} className={`cs-bubble-row ${isAdmin ? 'mine' : 'theirs'}`}>
                        <div className="cs-bubble">{msg.message}</div>
                        <div className="cs-bubble-meta">
                          <span>{isAdmin ? 'Support' : (msg.sender_name || 'User')}</span>
                          <span>·</span>
                          <span>{formatTime(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send row */}
              <div className="cs-send-row">
                <form className="cs-send-form" onSubmit={handleSend}>
                  <input
                    className="cs-send-input"
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a reply…"
                    disabled={sending}
                    autoComplete="off"
                  />
                  <button type="submit" className="cs-send-btn" disabled={sending || !messageText.trim()} aria-label="Send">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
