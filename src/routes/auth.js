const express = require('express');
const router = express.Router();
const db = require('../db');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this';

// Validation helper
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => password && password.length >= 6;

// Register
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashed = await bcryptjs.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users(name,email,password_hash,balance) VALUES($1,$2,$3,$4) RETURNING id,email,balance',
      [name || null, email, hashed, 0]
    );
    // Explicitly create empty portfolio for new user to ensure sync
    try {
      await db.query(
        'INSERT INTO portfolio(user_id,btc_balance,eth_balance,usdt_balance,usdc_balance,xrp_balance,ada_balance) VALUES($1,0,0,0,0,0,0) ON CONFLICT (user_id) DO NOTHING',
        [result.rows[0].id]
      );
    } catch (e) {
      console.warn('Portfolio creation on signup failed (non-critical):', e.message);
    }
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === '23505') {
      // Unique constraint violation (email already exists)
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email=$1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d',
    });

    // Return token and a minimal user object to match frontend expectations
    res.json({ success: true, token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET: Retrieve current user profile (requires JWT)
const { verifyToken } = require('../middleware/auth');

router.get('/me', verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    let portfolio = null;
    
    // Fetch user and portfolio in parallel to speed up response time
    const [userResult, portfolioResult] = await Promise.all([
      db.query('SELECT id, name, email, phone, fullName, COALESCE(balance,0) as balance, sim_enabled, sim_paused, created_at FROM users WHERE id=$1', [userId]),
      // Try to fetch portfolio in parallel, but don't fail if it doesn't exist
      db.query('SELECT btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance FROM portfolio WHERE user_id=$1', [userId])
        .catch(e => ({ rows: [] }))
    ]);

    const rows = userResult.rows;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    if (portfolioResult && portfolioResult.rows && portfolioResult.rows.length) {
      portfolio = portfolioResult.rows[0];
    }

    res.json({ success: true, user, portfolio });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT: Update user profile
router.put('/me', verifyToken, async (req, res) => {
  const userId = req.userId;
  const { fullName, email, phone } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET fullName=$1, email=$2, phone=$3 WHERE id=$4 RETURNING id, fullName, email, phone',
      [fullName, email, phone || null, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('Update profile error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST: Change password
router.post('/change-password', verifyToken, async (req, res) => {
  const userId = req.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcryptjs.compare(currentPassword, rows[0].password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcryptjs.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashed, userId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
