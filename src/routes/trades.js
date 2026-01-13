const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

/**
 * GET /api/trades - Fetch trade history (admin or authenticated user)
 * Admin: can see all trades with optional userId filter
 * User: can only see their own trades
 * Query params:
 *   - limit: max trades to return (default 50, max 500)
 *   - offset: pagination offset (default 0)
 *   - userId: filter by user (admin only, optional)
 *   - isSimulated: filter simulated trades only (optional, default true)
 */
router.get('/', (req, res, next) => {
  // Check if admin key is present
  const adminKey = req.headers['x-admin-key'];
  const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin_key_12345';
  
  if (adminKey && adminKey === ADMIN_KEY) {
    // Admin request
    return handleAdminTrades(req, res);
  }
  
  // Try user authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'change_this';
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.userId = decoded.userId;
      return handleUserTrades(req, res);
    });
  } else {
    return res.status(403).json({ error: 'Admin key or authentication token required' });
  }
});

/**
 * Handle admin trades request
 */
async function handleAdminTrades(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const isSimulated = req.query.isSimulated !== 'false'; // default true

    let query = 'SELECT * FROM trades WHERE is_simulated = $1';
    const params = [isSimulated];
    let paramIndex = 2;

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    // Get total count
    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM trades WHERE is_simulated = $1 ${userId ? `AND user_id = $${paramIndex - 1}` : ''}`,
      params.slice(0, paramIndex - 1)
    );
    const total = parseInt(countRes.rows[0].total);

    // Fetch paginated trades
    const result = await db.query(
      query + ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      trades: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Fetch trades error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
}

/**
 * Handle user trades request (user can only see their own trades)
 */
async function handleUserTrades(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const userId = req.userId; // Force user ID to current user
    const isSimulated = req.query.isSimulated !== 'false'; // default true

    // Get total count
    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM trades WHERE is_simulated = $1 AND user_id = $2`,
      [isSimulated, userId]
    );
    const total = parseInt(countRes.rows[0].total);

    // Fetch paginated trades
    const result = await db.query(
      `SELECT * FROM trades WHERE is_simulated = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [isSimulated, userId, limit, offset]
    );

    res.json({
      success: true,
      trades: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Fetch user trades error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
}

/**
 * GET /api/trades/:userId - Get trades for a specific user (admin only)
 */
router.get('/:userId', verifyAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = Math.min(parseInt(req.query.limit) || 20, 500);
    const offset = parseInt(req.query.offset) || 0;

    const result = await db.query(
      'SELECT * FROM trades WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const countRes = await db.query(
      'SELECT COUNT(*) as total FROM trades WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      trades: result.rows,
      pagination: {
        total: parseInt(countRes.rows[0].total),
        limit,
        offset,
      },
    });
  } catch (err) {
    console.error('Fetch user trades error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user trades' });
  }
});

/**
 * GET /api/trades/stats/summary - Trade statistics (admin only)
 */
router.get('/stats/summary', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_trades,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(balance_after - balance_before) as avg_balance_change,
        MAX(balance_after - balance_before) as max_balance_change,
        MIN(balance_after - balance_before) as min_balance_change
      FROM trades
      WHERE is_simulated = TRUE
    `);

    res.json({
      success: true,
      stats: result.rows[0],
    });
  } catch (err) {
    console.error('Fetch trade stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trade stats' });
  }
});

module.exports = router;
