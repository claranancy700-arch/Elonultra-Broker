/**
 * Balances Service
 * Handles balance operations, credits, and admin balance management
 */

const db = require('../db');
const sse = require('../sse/broadcaster');

const balancesService = {
  /**
   * Get user balance
   */
  async getBalance(userId) {
    const result = await db.query(
      'SELECT COALESCE(balance, 0) as balance FROM users WHERE id=$1',
      [userId]
    );
    return result.rows[0]?.balance || 0;
  },

  /**
   * Update user balance (admin override)
   */
  async setBalance(userId, amount, reason = 'admin override', taxId = null, skipLog = false) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get current balance
      const current = await client.query(
        'SELECT balance FROM users WHERE id=$1 FOR UPDATE',
        [userId]
      );
      if (!current.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }

      const oldBalance = parseFloat(current.rows[0].balance);
      const newBalance = parseFloat(amount);

      // Update balance and portfolio_value (keep them in sync)
      let updateQuery = 'UPDATE users SET balance=$1, portfolio_value=$1, updated_at=NOW()';
      const params = [newBalance];
      let paramIndex = 2;

      if (taxId) {
        updateQuery += `, tax_id=$${paramIndex}`;
        params.push(taxId);
        paramIndex++;
      }

      updateQuery += ` WHERE id=$${paramIndex}`;
      params.push(userId);

      await client.query(updateQuery, params);

      // Log transaction unless explicitly skipped (admin adjustments should not be logged when skipLog=true)
      if (!skipLog) {
        await client.query(
          `INSERT INTO transactions (user_id, type, amount, currency, status, reference)
           VALUES ($1, 'adjustment', $2, 'USD', 'completed', $3)`,
          [userId, newBalance - oldBalance, `admin: ${reason}`]
        );
      }

      await client.query('COMMIT');

      // Notify user
      try {
        sse.emit(userId, 'profile_update', {
          userId,
          type: 'admin_adjust',
          balance: newBalance,
        });
      } catch (e) {
        /* ignore */
      }

      return {
        oldBalance,
        newBalance,
        change: newBalance - oldBalance,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Credit amount to user balance
   */
  async credit(userId, amount, currency = 'USD', reference = 'admin-credit') {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get current balance
      const current = await client.query(
        'SELECT COALESCE(balance, 0) as balance FROM users WHERE id=$1 FOR UPDATE',
        [userId]
      );
      if (!current.rows.length) {
        await client.query('ROLLBACK');
        throw new Error('User not found');
      }

      const oldBalance = parseFloat(current.rows[0].balance);
      const newBalance = oldBalance + parseFloat(amount);

      // Update balance and portfolio_value (keep them in sync)
      await client.query(
        'UPDATE users SET balance=$1, portfolio_value=$1, updated_at=NOW() WHERE id=$2',
        [newBalance, userId]
      );

      // Log transaction
      const txResult = await client.query(
        `INSERT INTO transactions (user_id, type, amount, currency, status, reference)
         VALUES ($1, 'credit', $2, $3, 'completed', $4) RETURNING id`,
        [userId, amount, currency, reference]
      );

      await client.query('COMMIT');

      // Notify user
      try {
        sse.emit(userId, 'balance_updated', { balance: newBalance });
      } catch (e) {
        /* ignore */
      }

      return {
        transactionId: txResult.rows[0].id,
        oldBalance,
        newBalance,
        amount,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Debit amount from user balance
   */
  async debit(userId, amount, currency = 'USD', reference = 'debit') {
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      throw new Error('Insufficient balance');
    }
    return this.credit(userId, -amount, currency, reference);
  },
};

module.exports = balancesService;
