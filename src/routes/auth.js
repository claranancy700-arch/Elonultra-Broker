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
      'INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,email',
      [name || null, email, hashed]
    );
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

    res.json({ success: true, token, userId: user.id });
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
    const { rows } = await db.query('SELECT id, name, email, COALESCE(balance,0) as balance, created_at FROM users WHERE id=$1', [
      userId,
    ]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Fetch portfolio holdings if table exists
    let portfolio = null;
    try {
      const p = await db.query('SELECT btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance FROM portfolio WHERE user_id=$1', [userId]);
      if (p && p.rows && p.rows.length) portfolio = p.rows[0];
    } catch (e) {
      // ignore if portfolio table is missing
    }

    res.json({ success: true, user, portfolio });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;
