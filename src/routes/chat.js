const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// Simple message sanitization
const sanitizeMessage = (message) => {
  if (typeof message !== 'string') return '';
  return message
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .substring(0, 1000) // Limit length
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// Rate limiting middleware
const rateLimitMessages = (req, res, next) => {
  const userId = req.userId;
  const now = Date.now();
  
  if (!messageRateLimit.has(userId)) {
    messageRateLimit.set(userId, []);
  }
  
  const userMessages = messageRateLimit.get(userId);
  
  // Remove old messages outside the window
  const validMessages = userMessages.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  messageRateLimit.set(userId, validMessages);
  
  if (validMessages.length >= MAX_MESSAGES_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many messages. Please wait before sending another message.' });
  }
  
  // Add current message timestamp
  validMessages.push(now);
  next();
};

// All chat routes require authentication
router.use(verifyToken);

// GET /api/chat/conversations - Get user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.userId;
    const { rows } = await db.query(`
      SELECT
        c.*,
        u.name as user_name,
        u.email as user_email,
        a.name as admin_name,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.is_read = false AND cm.sender_type = 'admin') as unread_count,
        (SELECT message FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT sender_type FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_sender_type
      FROM chat_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users a ON c.admin_id = a.id
      WHERE c.user_id = $1
      ORDER BY c.last_message_at DESC
    `, [userId]);

    res.json({ success: true, conversations: rows });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/chat/conversations - Create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sanitizedMessage = sanitizeMessage(message);
    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Message contains invalid content' });
    }

    // Start transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create conversation
      const convResult = await client.query(`
        INSERT INTO chat_conversations (user_id, status)
        VALUES ($1, 'waiting')
        RETURNING *
      `, [userId]);

      const conversation = convResult.rows[0];

      // Add first message
      await client.query(`
        INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message)
        VALUES ($1, $2, 'user', $3)
      `, [conversation.id, userId, sanitizedMessage]);

      await client.query('COMMIT');

      res.json({
        success: true,
        conversation: {
          ...conversation,
          unread_count: 0,
          last_message: message.trim(),
          last_sender_type: 'user'
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/chat/conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.userId;

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Verify user owns this conversation
    const { rows: convRows } = await db.query(
      'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const { rows: messages } = await db.query(`
      SELECT
        cm.*,
        u.name as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = $1
      ORDER BY cm.created_at ASC
    `, [conversationId]);

    // Mark messages as read (only admin messages)
    await db.query(`
      UPDATE chat_messages
      SET is_read = true
      WHERE conversation_id = $1 AND sender_type = 'admin' AND is_read = false
    `, [conversationId]);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/conversations/:id/messages - Send message in conversation
router.post('/conversations/:id/messages', rateLimitMessages, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.userId;
    const { message } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sanitizedMessage = sanitizeMessage(message);
    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Message contains invalid content' });
    }

    // Verify user owns this conversation and it's active
    const { rows: convRows } = await db.query(
      'SELECT id, status FROM chat_conversations WHERE id = $1 AND user_id = $2 AND status = \'active\'',
      [conversationId, userId]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found or not active' });
    }

    // Insert message
    const { rows } = await db.query(`
      INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message)
      VALUES ($1, $2, 'user', $3)
      RETURNING *, (SELECT name FROM users WHERE id = $2) as sender_name
    `, [conversationId, userId, sanitizedMessage]);

    res.json({ success: true, message: rows[0] });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;