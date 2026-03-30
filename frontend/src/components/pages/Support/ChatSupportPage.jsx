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

  return (
    <div
      className="support-chat-page"
      style={{}}
    >
      <div className="support-chat-shell">
        <div className="support-chat-head">
          <h1>Chat Support</h1>
          <button
            type="button"
            className="support-chat-lock"
            onClick={() => {
              sessionStorage.removeItem(CHAT_SUPPORT_UNLOCK_KEY);
              sessionStorage.removeItem(CHAT_SUPPORT_ADMIN_KEY);
              navigate('/chat-support-unlock', { replace: true });
            }}
          >
            Lock
          </button>
        </div>

        {error ? <div className="support-chat-error">{error}</div> : null}

        <div className={`support-chat-layout ${activeConversation ? 'messages-open' : 'conversations-open'}`}>
          {!activeConversation ? (
            <aside className="support-conversations support-conversations-full">
              <div className="support-conversations-title">Support Conversations</div>
              {isLoadingConversations ? (
                <div className="support-empty">Loading conversations...</div>
              ) : conversations.length === 0 ? (
                <div className="support-empty">No conversations yet.</div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    type="button"
                    key={conversation.id}
                    className="support-conversation-item"
                    onClick={() => {
                      setActiveConversation(conversation);
                      setMessageText('');
                    }}
                  >
                    <span className="name">{conversation.user_name || `User ${conversation.user_id}`}</span>
                    <span className="meta">{formatTime(conversation.last_message_at || conversation.updated_at)}</span>
                  </button>
                ))
              )}
            </aside>
          ) : (
            <section className="support-messages-panel support-messages-panel-full">
              <div className="support-messages-header">
                <button
                  type="button"
                  className="support-back"
                  onClick={() => {
                    setActiveConversation(null);
                    setMessages([]);
                    setMessageText('');
                  }}
                >
                  Back to conversations
                </button>
                <div className="support-messages-title">
                  {activeConversation.user_name || `User ${activeConversation.user_id}`}
                </div>
              </div>

              <div className="support-messages-list" ref={messagesListRef}>
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="support-empty">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="support-empty">No messages yet.</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`support-message support-message-${msg.sender_type === 'admin' ? 'mine' : 'theirs'}`}
                    >
                      <div className="support-message-author">
                        {msg.sender_type === 'admin' ? 'Support' : msg.sender_name || 'User'}
                      </div>
                      <div className="support-message-body">{msg.message}</div>
                      <div className="support-message-time">{formatTime(msg.created_at)}</div>
                    </div>
                  ))
                )}
              </div>

              <form className="support-send-row" onSubmit={handleSend}>
                <input
                  type="text"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Type your reply..."
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !messageText.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
