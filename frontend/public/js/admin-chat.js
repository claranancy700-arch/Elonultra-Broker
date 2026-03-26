/**
 * Admin Chat Module
 * Provides WebSocket-based chat functionality for admin.html
 * Works with the same socket.io backend as the React components
 */

/* global CBApi */
(function(){
  'use strict';

  // API and socket base URLs
  const API_BASE_URL = window.__apiBase ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:5001/api`
      : `${window.location.origin}/api`);

  const SOCKET_BASE_URL = (window.__apiBase ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${window.location.hostname}:5001/api`
      : `${window.location.origin}/api`))
    .replace(/\/api\/?$/, '');

  // Get admin key - check sessionStorage first (populated by admin.js), then localStorage, then window var
  function getAdminKey() {
    return sessionStorage.getItem('adminKey') ||
           localStorage.getItem('adminKey') ||
           window.__ADMIN_KEY ||
           'admin-key';
  }

  // State
  let socket = null;
  let socketConnected = false;
  let conversations = [];
  let activeConversation = null;
  let messages = [];

  // DOM Elements
  let chatContainer, conversationsList, messagesList, messageInput, sendBtn, statusIndicator;

  /**
   * Initialize socket.io connection
   */
  function initializeSocket() {
    // Check if socket.io is available
    if (typeof io === 'undefined') {
      console.warn('socket.io-client not loaded yet, retrying in 1 second...');
      setTimeout(initializeSocket, 1000);
      return;
    }

    console.log('[admin-chat] connecting to namespace', `${SOCKET_BASE_URL}/chat`);
    socket = io(`${SOCKET_BASE_URL}/chat`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: { adminKey: getAdminKey() }
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Admin chat socket connected:', socket.id);
      socketConnected = true;
      updateSocketStatus();
      loadConversations();
    });

    socket.on('disconnect', () => {
      console.log('Admin chat socket disconnected');
      socketConnected = false;
      updateSocketStatus();
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      socketConnected = false;
      updateSocketStatus();
    });

    socket.on('new_message', (message) => {
      if (activeConversation && message.conversation_id === activeConversation.id) {
        messages.push(message);
        renderMessages();
        scrollToBottom();
      }
      // Update conversation in list
      const conv = conversations.find(c => c.id === message.conversation_id);
      if (conv) {
        conv.last_message = message.message;
        conv.last_sender_type = message.sender_type;
        conv.last_message_at = message.created_at;
      }
    });
  }

  /**
   * Load all conversations from API
   */
  async function loadConversations() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/chat/conversations`, {
        headers: {
          'x-admin-key': getAdminKey()
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        conversations = data.conversations || [];
        renderConversationsList();
        if (conversations.length > 0 && !activeConversation) {
          selectConversation(conversations[0]);
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      showError('Failed to load conversations');
    }
  }

  /**
   * Load messages for a specific conversation
   */
  async function loadMessages(conversationId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/chat/conversations/${conversationId}/messages`,
        {
          headers: {
            'x-admin-key': getAdminKey()
          }
        }
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (data.success) {
        messages = data.messages || [];
        renderMessages();
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showError('Failed to load messages');
    }
  }

  /**
   * Send a message via socket
   */
  function sendMessage() {
    if (!messageInput.value.trim() || !activeConversation || !socketConnected) {
      console.log('[admin-chat] send blocked:', {
        hasMessage: !!messageInput.value.trim(),
        hasConversation: !!activeConversation,
        socketConnected,
        conversationStatus: activeConversation?.status
      });
      return;
    }

    // Check if conversation is closed
    if (activeConversation.status === 'closed') {
      console.error('[admin-chat] Cannot send message to closed conversation');
      showError('This conversation is closed');
      return;
    }

    const adminId = parseInt(localStorage.getItem('adminId'), 10) || 1; // Use 1 as default admin ID

    const messageData = {
      conversationId: activeConversation.id,
      message: messageInput.value.trim(),
      senderId: adminId,
      senderType: 'admin'
    };

    console.log('[admin-chat] sending message:', messageData);

    // Optimistically add message
    messages.push({
      ...messageData,
      created_at: new Date().toISOString(),
      sender_type: 'admin',
      sender_name: 'Admin',
      id: Date.now()
    });
    renderMessages();
    scrollToBottom();

    // Send via socket
    console.log('[admin-chat] emitting send_message via socket:', messageData, 'socket connected:', socketConnected);
    socket.emit('send_message', messageData);

    // Also persist via API fallback (use server admin endpoint)
    fetch(`${API_BASE_URL}/admin/chat/conversations/${activeConversation.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': getAdminKey()
      },
      body: JSON.stringify({ message: messageData.message, adminId })
    }).then(response => {
      console.log('[admin-chat] API response:', response.status, response.ok, 'for conversation:', activeConversation.id);
      if (!response.ok) {
        console.error('[admin-chat] API error details:', response);
        return response.text();
      }
      return response.json();
    }).then(data => {
      console.log('[admin-chat] API data:', data);
      if (data && data.error) {
        console.error('[admin-chat] API error:', data.error);
        // Remove the optimistically added message if API failed
        messages = messages.filter(msg => msg.id !== Date.now());
        renderMessages();
        showError(data.error);
      }
    }).catch(err => {
      console.error('Admin message API fallback failed:', err);
      // Remove the optimistically added message if API failed
      messages = messages.filter(msg => msg.id !== Date.now());
      renderMessages();
    });

    messageInput.value = '';
  }

  /**
   * Update conversation status
   */
  async function updateConversationStatus(conversationId, status) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/chat/conversations/${conversationId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': getAdminKey()
          },
          body: JSON.stringify({ status })
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.status = status;
        renderConversationsList();
      }
    } catch (error) {
      console.error('Error updating conversation status:', error);
      showError('Failed to update status');
    }
  }

  /**
   * Select a conversation to view
   */
  function selectConversation(conversation) {
    activeConversation = conversation;
    messages = [];
    if (socket && socketConnected) {
      socket.emit('join_conversation', conversation.id);
    }
    loadMessages(conversation.id);
    renderConversationsList();
  }

  /**
   * Render conversations list
   */
  function renderConversationsList() {
    if (!conversationsList) return;

    conversationsList.innerHTML = conversations.map(conv => `
      <div class="admin-chat-conv-item ${activeConversation?.id === conv.id ? 'active' : ''}" 
           onclick="window.__adminChat.selectConversation(${JSON.stringify(conv).replace(/"/g, '&quot;')})">
        <div class="conv-user">${conv.user_name || `User ${conv.user_id}`}</div>
        <div class="conv-preview">${conv.last_message ? conv.last_message.substring(0, 50) + '...' : 'No messages'}</div>
        <div class="conv-status">
          <span class="status-badge" data-status="${conv.status}">${conv.status}</span>
          ${conv.unread_count > 0 ? `<span class="unread">${conv.unread_count}</span>` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Render messages
   */
  function renderMessages() {
    if (!messagesList) return;

    messagesList.innerHTML = messages.map(msg => `
      <div class="admin-chat-message ${msg.sender_type === 'admin' ? 'admin' : 'user'}">
        <div class="msg-sender">${msg.sender_type === 'admin' ? 'Admin' : 'User'}</div>
        <div class="msg-content">${escapeHtml(msg.message)}</div>
        <div class="msg-time">${new Date(msg.created_at).toLocaleTimeString()}</div>
      </div>
    `).join('');
  }

  /**
   * Update socket status indicator
   */
  function updateSocketStatus() {
    if (statusIndicator) {
      statusIndicator.textContent = socketConnected ? '🟢 Connected' : '🔴 Disconnected';
      statusIndicator.className = socketConnected ? 'status-connected' : 'status-disconnected';
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    console.error(message);
    // You can add a toast/notification here
  }

  /**
   * Scroll messages to bottom
   */
  function scrollToBottom() {
    if (messagesList) {
      messagesList.scrollTop = messagesList.scrollHeight;
    }
  }

  /**
   * Escape HTML characters
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Open chat modal
   */
  function openChatModal() {
    const modal = document.getElementById('admin-chat-modal');
    if (modal) {
      modal.classList.add('active');
    }
    if (!socketConnected) {
      initializeSocket();
    }
  }

  /**
   * Close chat modal
   */
  function closeChatModal() {
    const modal = document.getElementById('admin-chat-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  /**
   * Initialize the chat interface
   */
  function init() {
    // Create modal HTML
    const modalHTML = `
      <div id="admin-chat-modal" class="admin-chat-modal">
        <div class="admin-chat-container">
          <div class="admin-chat-header">
            <h3>Admin Chat Support</h3>
            <div style="display:flex; gap:12px; align-items:center;">
              <span id="admin-chat-status" class="admin-chat-status">🔴 Disconnected</span>
              <button onclick="window.__adminChat.closeModal()" class="admin-chat-close">&times;</button>
            </div>
          </div>
          
          <div class="admin-chat-content">
            <div id="admin-chat-conversations" class="admin-chat-conversations">
              <div style="padding:12px; color:#999; text-align:center;">Loading conversations...</div>
            </div>
            
            <div class="admin-chat-main">
              <div id="admin-chat-messages" class="admin-chat-messages"></div>
              
              <div class="admin-chat-input">
                <input 
                  id="admin-chat-input" 
                  type="text" 
                  placeholder="Type your response..." 
                  onkeypress="if(event.key==='Enter') window.__adminChat.sendMessage()"
                />
                <button id="admin-chat-send" class="btn">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inject modal into DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Get references
    chatContainer = document.getElementById('admin-chat-modal');
    conversationsList = document.getElementById('admin-chat-conversations');
    messagesList = document.getElementById('admin-chat-messages');
    messageInput = document.getElementById('admin-chat-input');
    sendBtn = document.getElementById('admin-chat-send');
    statusIndicator = document.getElementById('admin-chat-status');

    // Add event listeners
    sendBtn.addEventListener('click', () => sendMessage());

    // Initialize socket
    initializeSocket();
  }

  // Expose public API
  window.__adminChat = {
    openModal: openChatModal,
    closeModal: closeChatModal,
    selectConversation,
    sendMessage,
    updateConversationStatus
  };

  // Initialize when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
