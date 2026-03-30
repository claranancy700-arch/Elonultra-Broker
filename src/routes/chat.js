const express = require('express');
const router = express.Router();
const db = require('../db');

// Simple message sanitization
const sanitizeMessage = (message) => {
  if (typeof message !== 'string') return '';
  return message
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .substring(0, 1000) // Limit length
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// Middleware to verify user authentication and get user data
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Verify token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'change_this';
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user data
    const { rows } = await db.query('SELECT id, name, email FROM users WHERE id = $1', [decoded.userId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// GET /api/chat/conversations - Get user's conversations
router.get('/conversations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await db.query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.is_read = false AND cm.sender_type = 'admin') as unread_count,
        (SELECT message FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT sender_type FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_sender_type,
        (SELECT created_at FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_at
      FROM chat_conversations c
      WHERE c.user_id = $1
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `, [userId]);

    res.json({ success: true, conversations: rows });
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/chat/conversations - Create new conversation
router.post('/conversations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sanitizedMessage = sanitizeMessage(message);
    if (sanitizedMessage.length === 0) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Start transaction
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Create conversation
      const convResult = await client.query(`
        INSERT INTO chat_conversations (user_id, status, created_at, updated_at)
        VALUES ($1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [userId]);

      const conversation = convResult.rows[0];

      // Create initial message
      const msgResult = await client.query(`
        INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message, created_at)
        VALUES ($1, $2, 'user', $3, CURRENT_TIMESTAMP)
        RETURNING *,
          CASE
            WHEN $4 = 'admin' THEN 'Admin'
            ELSE (SELECT name FROM users WHERE id = $2)
          END as sender_name
      `, [conversation.id, userId, sanitizedMessage, 'user']);

      await client.query('COMMIT');

      // Emit socket event for new conversation
      const io = req.app.get('io');
      if (io) {
        io.of('/chat').emit('conversation_created', {
          ...conversation,
          last_message: sanitizedMessage,
          last_sender_type: 'user',
          last_message_at: new Date(),
          unread_count: 0
        });
      }

      res.json({
        success: true,
        conversation: {
          ...conversation,
          last_message: sanitizedMessage,
          last_sender_type: 'user',
          last_message_at: new Date(),
          unread_count: 0
        },
        message: msgResult.rows[0]
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
router.get('/conversations/:id/messages', authenticateUser, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    // Verify conversation belongs to user
    const convCheck = await db.query(
      'SELECT id FROM chat_conversations WHERE id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { rows } = await db.query(`
      SELECT
        cm.*,
        CASE
          WHEN cm.sender_type = 'admin' THEN 'Admin'
          ELSE u.name
        END as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id AND cm.sender_type = 'user'
      WHERE cm.conversation_id = $1
      ORDER BY cm.created_at ASC
    `, [conversationId]);

    // Mark user messages as read
    await db.query(`
      UPDATE chat_messages
      SET is_read = true
      WHERE conversation_id = $1 AND sender_type = 'admin' AND is_read = false
    `, [conversationId]);

    res.json({ success: true, messages: rows });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/conversations/:id/messages - Send message in conversation
router.post('/conversations/:id/messages', authenticateUser, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;
    const { message } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const sanitizedMessage = sanitizeMessage(message);
    if (sanitizedMessage.length === 0) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Verify conversation belongs to user and is active
    const convCheck = await db.query(
      'SELECT id, status FROM chat_conversations WHERE id = $1 AND user_id = $2 AND status = \'active\'',
      [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found or inactive' });
    }

    // Insert message
    const { rows } = await db.query(`
      INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message)
      VALUES ($1, $2, $3, $4)
      RETURNING *,
        CASE
          WHEN $3 = 'admin' THEN 'Admin'
          ELSE (SELECT name FROM users WHERE id = $2)
        END as sender_name
    `, [conversationId, userId, 'user', sanitizedMessage]);

    const newMessage = rows[0];

    // Update conversation last message time
    await db.query(`
      UPDATE chat_conversations
      SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [conversationId]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.of('/chat').to(`conversation_${conversationId}`).emit('new_message', newMessage);
    }

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;