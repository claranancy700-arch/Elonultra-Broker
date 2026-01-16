const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// GET /api/prompts - list active unresponded prompts for the authenticated user (includes broadcasts)
router.get('/', verifyToken, async (req, res) => {
  const userId = req.userId;
  try {
    console.log('[PROMPT LIST] Fetching active unresponded prompts for user:', userId);
    const q = await db.query(
      `SELECT p.id, p.user_id, p.message, p.created_at, r.id as response_id, r.response, r.created_at as responded_at
       FROM admin_prompts p
       LEFT JOIN admin_prompt_responses r ON r.prompt_id = p.id AND r.user_id = $1
       WHERE (p.user_id IS NULL OR p.user_id = $1)
         AND p.is_active = TRUE
         AND r.id IS NULL
       ORDER BY p.created_at DESC`,
      [userId]
    );
    console.log('[PROMPT LIST] Found', q.rows.length, 'active unresponded prompts for user', userId);
    if (q.rows.length > 0) {
      console.log('[PROMPT LIST] Prompt IDs:', q.rows.map(p => p.id));
    }
    return res.json({ success: true, prompts: q.rows });
  } catch (err) {
    console.error('List user prompts failed:', err.message || err);
    return res.status(500).json({ error: 'failed to list prompts' });
  }
});

// POST /api/prompts/:id/respond - submit a response to a prompt
router.post('/:id/respond', verifyToken, async (req, res) => {
  const userId = req.userId;
  const promptId = parseInt(req.params.id, 10);
  const { response } = req.body;
  if (isNaN(promptId)) return res.status(400).json({ error: 'invalid prompt id' });
  if (!response || String(response).trim() === '') return res.status(400).json({ error: 'response required' });
  try {
    console.log('[PROMPT RESPOND] User', userId, 'responding to prompt', promptId, 'with:', response);
    
    // Insert response and automatically mark prompt as inactive
    const client = await db.getClient();
    await client.query('BEGIN');
    
    await client.query('INSERT INTO admin_prompt_responses(prompt_id, user_id, response, created_at) VALUES($1,$2,$3,NOW())', [promptId, userId, response]);
    await client.query('UPDATE admin_prompts SET is_active = FALSE WHERE id = $1', [promptId]);
    
    await client.query('COMMIT');
    client.release();
    
    console.log('[PROMPT RESPOND] ✓ Response saved and prompt deactivated for user', userId, 'prompt', promptId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[PROMPT RESPOND] ✗ FAILED for user', userId, 'prompt', promptId, ':', err.message || err);
    return res.status(500).json({ error: 'failed to save response' });
  }
});

// POST /api/prompts/:id/read - mark a prompt as read
router.post('/:id/read', verifyToken, async (req, res) => {
  const promptId = parseInt(req.params.id, 10);
  if (isNaN(promptId)) return res.status(400).json({ error: 'invalid prompt id' });
  try {
    await db.query('UPDATE admin_prompts SET is_read = TRUE WHERE id = $1', [promptId]);
    return res.json({ success: true });
  } catch (err) {
    console.error('Mark prompt as read failed:', err.message || err);
    return res.status(500).json({ error: 'failed to update' });
  }
});

// POST /api/prompts/:id/disable - disable a prompt (admin only)
router.post('/:id/disable', async (req, res) => {
  const promptId = parseInt(req.params.id, 10);
  const provided = req.headers['x-admin-key'];
  
  // Use dynamic key retrieval (checks both ADMIN_KEY and ADMIN_API_KEY)
  const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || null;
  
  if (!ADMIN_KEY) {
    return res.status(503).json({ error: 'Admin API key not configured on server' });
  }
  if (!provided || provided !== ADMIN_KEY) {
    return res.status(403).json({ error: 'unauthorized' });
  }
  if (isNaN(promptId)) return res.status(400).json({ error: 'invalid prompt id' });
  try {
    console.log('[PROMPT DISABLE] Admin disabling prompt', promptId);
    await db.query('UPDATE admin_prompts SET is_active = FALSE WHERE id = $1', [promptId]);
    console.log('[PROMPT DISABLE] ✓ Prompt', promptId, 'disabled');
    return res.json({ success: true });
  } catch (err) {
    console.error('[PROMPT DISABLE] ✗ Failed for prompt', promptId, ':', err.message || err);
    return res.status(500).json({ error: 'failed to disable prompt' });
  }
});

module.exports = router;
