/**
 * Users Service
 * Handles all user-related business logic
 */

const db = require('../db');
const bcryptjs = require('bcryptjs');

const usersService = {
  /**
   * Create new user
   */
  async create(name, email, password) {
    const hashed = await bcryptjs.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users(name, email, password_hash) VALUES($1, $2, $3) RETURNING id, email, name',
      [name || null, email, hashed]
    );
    return result.rows[0];
  },

  /**
   * Get user by ID
   */
  async getById(userId) {
    const result = await db.query(
      'SELECT id, name, email, balance, created_at, updated_at FROM users WHERE id=$1',
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get user by email
   */
  async getByEmail(email) {
    const result = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email=$1',
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all users (admin only)
   */
  async getAll(limit = 100, offset = 0) {
    const result = await db.query(
      'SELECT id, name, email, balance, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const countRes = await db.query('SELECT COUNT(*) as total FROM users');
    return {
      users: result.rows,
      total: parseInt(countRes.rows[0].total),
    };
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, fullName, email, phone) {
    const result = await db.query(
      'UPDATE users SET fullName=$1, email=$2, phone=$3, updated_at=NOW() WHERE id=$4 RETURNING id, email, fullName',
      [fullName, email, phone || null, userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Verify password
   */
  async verifyPassword(userId, password) {
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id=$1',
      [userId]
    );
    if (!result.rows.length) return false;
    return bcryptjs.compare(password, result.rows[0].password_hash);
  },

  /**
   * Change password
   */
  async changePassword(userId, newPassword) {
    const hashed = await bcryptjs.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2',
      [hashed, userId]
    );
    return true;
  },

  /**
   * Check if email exists
   */
  async emailExists(email) {
    const result = await db.query(
      'SELECT id FROM users WHERE email=$1',
      [email]
    );
    return result.rows.length > 0;
  },
};

module.exports = usersService;
