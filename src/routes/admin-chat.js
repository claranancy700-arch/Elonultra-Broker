const express = require('express');
const router = express.Router();
const db = require('../db');

// Admin key middleware
function requireAdminKey(req, res, next) {
  const provided = req.headers['x-admin-key'];
  const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || 'admin-key';
  if (!provided || provided !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
// Simple message sanitization
const sanitizeMessage = (message) => {
  if (typeof message !== 'string') return '';
  return message
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .substring(0, 1000) // Limit length
    .replace(/\s+/g, ' '); // Normalize whitespace
};
// GET /api/admin/chat/conversations - Get all conversations for admin
router.get('/conversations', requireAdminKey, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        c.*,
        u.name as user_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.is_read = false AND cm.sender_type = 'user') as unread_count,
        (SELECT message FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT sender_type FROM chat_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_sender_type
      FROM chat_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.last_message_at DESC
    `);

    res.json({ success: true, conversations: rows });
  } catch (error) {
    console.error('Error fetching admin conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/admin/chat/conversations/:id/messages - Get messages for a specific conversation
router.get('/conversations/:id/messages', requireAdminKey, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
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

    // Mark user messages as read
    await db.query(`
      UPDATE chat_messages
      SET is_read = true
      WHERE conversation_id = $1 AND sender_type = 'user' AND is_read = false
    `, [conversationId]);

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/admin/chat/conversations/:id/status - Update conversation status
router.put('/conversations/:id/status', requireAdminKey, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!['waiting', 'active', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.query(
      'UPDATE chat_conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, conversationId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// POST /api/admin/chat/conversations/:id/messages - Send message as admin
router.post('/conversations/:id/messages', requireAdminKey, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { message, adminId } = req.body;

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

    // Verify conversation exists and is not closed
    const { rows: convRows } = await db.query(
      'SELECT id, status FROM chat_conversations WHERE id = $1',
      [conversationId]
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (convRows[0].status === 'closed') {
      return res.status(400).json({ error: 'Cannot send messages to closed conversation' });
    }

    // Insert message
    const { rows } = await db.query(`
      INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message)
      VALUES ($1, $2, 'admin', $3)
      RETURNING *, 'Admin' as sender_name
    `, [conversationId, adminId || 0, sanitizedMessage]);

    await db.query(`
      UPDATE chat_conversations
      SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [conversationId]);

    const io = req.app.get('io');
    if (io) {
      io.of('/chat').to(`conversation_${conversationId}`).emit('new_message', rows[0]);
    }

    res.json({ success: true, message: rows[0] });
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/admin/chat/stats - Get chat statistics
router.get('/stats', requireAdminKey, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) as total_conversations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_conversations,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_conversations,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_conversations,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_conversations
      FROM chat_conversations
    `);

    const { rows: messageStats } = await db.query(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_messages,
        COUNT(CASE WHEN sender_type = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN sender_type = 'admin' THEN 1 END) as admin_messages
      FROM chat_messages
    `);

    res.json({
      success: true,
      stats: {
        conversations: rows[0],
        messages: messageStats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;