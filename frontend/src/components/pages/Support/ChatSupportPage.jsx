import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../../../utils/apiConfig';
import './ChatSupportPage.css';

const CHAT_SUPPORT_UNLOCK_KEY = 'chat_support_unlocked';
const CHAT_SUPPORT_ADMIN_KEY = 'chat_support_admin_key';
const API_BASE_URL = getApiBaseUrl();

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
  const messagesListRef = useRef(null);
  const activeConversationId = activeConversation?.id || null;

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
    if (!activeConversationId) return undefined;

    const interval = setInterval(() => {
      fetchMessages(activeConversationId, { silent: true });
      fetchConversations({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [activeConversationId, fetchConversations, fetchMessages]);

  useEffect(() => {
    if (!activeConversationId) return;
    scrollToLatestMessage();
  }, [activeConversationId, messages, scrollToLatestMessage]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversation?.id || !messageText.trim() || sending) return;

    setSending(true);
    setError('');
    try {
      await requestJson(
        `/api/admin/chat/conversations/${activeConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: messageText.trim(),
            adminId: 1
          })
        }
      );

      setMessageText('');
      await fetchMessages(activeConversation.id);
      await fetchConversations();
    } catch (err) {
      setError(err?.message || 'Failed to send message');
    } finally {
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
      style={{ position: 'relative', zIndex: 2, minHeight: '100vh' }}
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
                {isLoadingMessages ? (
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
