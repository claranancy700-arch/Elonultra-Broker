/**
 * Admin Controller
 * Handles admin-level operations: balance management, simulator controls, user management
 */

const response = require('../utils/response');
const balancesService = require('../services/balances.service');
const usersService = require('../services/users.service');
const db = require('../db');

const adminController = {
  /**
   * Get user balance and simulator status
   */
  async getUserSimulator(req, res, next) {
    try {
      const { id: userId } = req.params;
      const user = await db.query(
        'SELECT sim_enabled, sim_paused, sim_next_run_at, sim_last_run_at, sim_started_at, balance FROM users WHERE id=$1',
        [userId]
      );
      if (!user.rows.length) {
        return response.notFound(res, 'User not found');
      }
      return response.success(res, { simulator: user.rows[0] });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Start simulator for user
   */
  async startSimulator(req, res, next) {
    try {
      const { id: userId } = req.params;
      const { delayMinutes = 5 } = req.body;

      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        // Get current balance
        const ures = await client.query(
          'SELECT id, COALESCE(balance, 0) AS balance FROM users WHERE id=$1 FOR UPDATE',
          [userId]
        );
        if (!ures.rows.length) {
          await client.query('ROLLBACK');
          return response.notFound(res, 'User not found');
        }

        const next_run = delayMinutes <= 0 ? 'NOW()' : `NOW() + interval '${delayMinutes} minutes'`;
        await client.query(
          `UPDATE users
           SET sim_enabled=TRUE, sim_paused=FALSE, sim_next_run_at=${next_run},
               sim_started_at = COALESCE(sim_started_at, NOW()), updated_at=NOW()
           WHERE id=$1`,
          [userId]
        );

        await client.query('COMMIT');
        return response.success(res, { message: 'Simulator started' });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  },

  /**
   * Pause simulator for user
   */
  async pauseSimulator(req, res, next) {
    try {
      const { id: userId } = req.params;
      await db.query(
        'UPDATE users SET sim_paused=TRUE, updated_at=NOW() WHERE id=$1',
        [userId]
      );
      return response.success(res, { message: 'Simulator paused' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update user balance (set to specific amount)
   */
  async setBalance(req, res, next) {
    try {
      const { id: userId } = req.params;
      const { amount, reason = 'admin override', tax_id } = req.body;

      if (!amount || isNaN(amount)) {
        return response.badRequest(res, 'Invalid amount');
      }

      const result = await balancesService.setBalance(userId, amount, reason, tax_id);
      if (!result) {
        return response.notFound(res, 'User not found');
      }

      return response.success(res, {
        message: `Balance updated from $${result.oldBalance.toFixed(2)} to $${result.newBalance.toFixed(2)}`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Credit amount to user
   */
  async creditUser(req, res, next) {
    try {
      const { userId, amount, currency = 'USD', reference = 'admin-credit' } = req.body;

      if (!userId || !amount || isNaN(amount)) {
        return response.badRequest(res, 'Invalid userId or amount');
      }

      const result = await balancesService.credit(userId, amount, currency, reference);
      return response.success(res, {
        message: 'Credit successful',
        transactionId: result.transactionId,
        ...result,
      });
    } catch (err) {
      if (err.message === 'User not found') {
        return response.notFound(res, err.message);
      }
      next(err);
    }
  },

  /**
   * Get all users (paginated)
   */
  async getAllUsers(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const result = await usersService.getAll(Math.min(limit, 500), offset);
      return response.paginated(res, result.users, result.total, limit, offset);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get single user details
   */
  async getUser(req, res, next) {
    try {
      const { id: userId } = req.params;
      const user = await usersService.getById(userId);
      if (!user) {
        return response.notFound(res, 'User not found');
      }
      return response.success(res, { user });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminController;
