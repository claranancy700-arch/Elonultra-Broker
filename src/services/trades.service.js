/**
 * Trades Service
 * Handles trade operations and queries
 */

const db = require('../db');

const tradesService = {
  /**
   * Get trades for admin (all trades with optional filter)
   */
  async getAdminTrades(limit = 50, offset = 0, userId = null, isSimulated = true) {
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
      `SELECT COUNT(*) as total FROM trades WHERE is_simulated = $1 ${userId ? `AND user_id = $2` : ''}`,
      userId ? [isSimulated, userId] : [isSimulated]
    );
    const total = parseInt(countRes.rows[0].total);

    // Fetch paginated trades
    const result = await db.query(
      query + ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      trades: result.rows,
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    };
  },

  /**
   * Get trades for user (own trades only)
   */
  async getUserTrades(userId, limit = 50, offset = 0, isSimulated = true) {
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

    return {
      trades: result.rows,
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    };
  },

  /**
   * Get trade statistics
   */
  async getStats() {
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
    return result.rows[0];
  },

  /**
   * Clear all trades (admin only)
   */
  async clearAllTrades() {
    const result = await db.query('DELETE FROM trades RETURNING id');
    return result.rows.length;
  },

  /**
   * Clear trades for specific user
   */
  async clearUserTrades(userId) {
    const result = await db.query(
      'DELETE FROM trades WHERE user_id = $1 RETURNING id',
      [userId]
    );
    return result.rows.length;
  },
};

module.exports = tradesService;
