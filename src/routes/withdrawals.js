const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// POST: Request a new withdrawal
router.post('/', verifyToken, async (req, res) => {
  const { amount, crypto_type, crypto_address } = req.body;
  const userId = req.userId;

  // Validate input
  if (!amount || !crypto_type || !crypto_address) {
    return res.status(400).json({ error: 'Amount, crypto type, and address are required' });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const supportedCryptos = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
  if (!supportedCryptos.includes(crypto_type.toUpperCase())) {
    return res
      .status(400)
      .json({ error: `Unsupported crypto type. Supported: ${supportedCryptos.join(', ')}` });
  }

  // Validate crypto address (simple regex, not exhaustive)
  const addressRegex = /^[a-zA-Z0-9]{20,255}$/;
  if (!addressRegex.test(crypto_address)) {
    return res.status(400).json({ error: 'Invalid crypto address format' });
  }

  try {
    // Insert withdrawal request with 'pending' status
    const result = await db.query(
      'INSERT INTO withdrawals(user_id, amount, crypto_type, crypto_address, status) VALUES($1, $2, $3, $4, $5) RETURNING id, status, created_at',
      [userId, amount, crypto_type.toUpperCase(), crypto_address, 'pending']
    );

    const withdrawal = result.rows[0];
    res.status(201).json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount,
        crypto_type: crypto_type.toUpperCase(),
        status: withdrawal.status,
        created_at: withdrawal.created_at,
      },
    });
  } catch (err) {
    console.error('Withdrawal creation error:', err);
    res.status(500).json({ error: 'Failed to create withdrawal request' });
  }
});

// GET: Retrieve withdrawal status by ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const result = await db.query(
      'SELECT id, amount, crypto_type, crypto_address, status, txn_hash, error_message, created_at, processed_at FROM withdrawals WHERE id=$1 AND user_id=$2',
      [id, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    const withdrawal = result.rows[0];
    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error('Withdrawal fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch withdrawal' });
  }
});

// GET: List all withdrawals for the current user
router.get('/', verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const result = await db.query(
      'SELECT id, amount, crypto_type, status, created_at, processed_at FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    res.json({ success: true, withdrawals: result.rows });
  } catch (err) {
    console.error('Withdrawals list error:', err);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

module.exports = router;
