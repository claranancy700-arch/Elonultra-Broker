const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const { recordLossIfApplicable } = require('../services/balanceChanges');
const sse = require('../sse/broadcaster');

// POST: Request a new withdrawal (adds 30% fee requirement)
router.post('/', verifyToken, async (req, res) => {
  const { amount, crypto_type, crypto_address } = req.body;
  const userId = req.userId;
  console.log('[WITHDRAWAL REQUEST] Incoming request from user:', userId, 'payload:', { amount, crypto_type, crypto_address });

  // Validate input
  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }
  if (!crypto_type || !crypto_address) {
    return res.status(400).json({ error: 'Crypto type and address are required' });
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

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Lock user balance and ensure sufficient funds
    const balRes = await client.query('SELECT COALESCE(balance,0) AS balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!balRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const currentBalance = parseFloat(balRes.rows[0].balance) || 0;
    const feeAmount = amt * 0.3; // 30% fee calculated from requested amount
    const totalRequired = amt + feeAmount;
    
    if (currentBalance < totalRequired) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient balance. Required: $${totalRequired.toFixed(2)} (amount + 30% fee), Available: $${currentBalance.toFixed(2)}` });
    }
    const balanceSnapshot = currentBalance;

    console.log('[WITHDRAWAL] Creating withdrawal:', { userId, amt, crypto_type, feeAmount });
    const withdrawalResult = await client.query(
      `INSERT INTO withdrawals(user_id, amount, crypto_type, crypto_address, status, balance_snapshot, fee_amount, fee_status)
       VALUES($1, $2, $3, $4, $5, $6, $7, 'required')
       RETURNING id, status, created_at, fee_amount, fee_status, balance_snapshot`,
      [userId, amt, crypto_type.toUpperCase(), crypto_address, 'pending', balanceSnapshot, feeAmount]
    );

    console.log('[WITHDRAWAL] Withdrawal created, ID:', withdrawalResult.rows[0].id);

    // Deduct withdrawal amount AND fee from balance immediately
    const newBalance = Number(currentBalance) - Number(amt) - Number(feeAmount);
    console.log('[WITHDRAWAL] Updating balance:', { userId, currentBalance, withdrawalAmount: amt, feeAmount, newBalance });
    await client.query('UPDATE users SET balance = $2, portfolio_value = $2, updated_at = NOW() WHERE id=$1', [userId, newBalance]);

    // If balance decreased and user has no tax_id, record trading loss entry
    try {
      await recordLossIfApplicable(client, userId, currentBalance, newBalance);
    } catch (e) { console.warn('[withdrawal] failed to record loss', e && e.message ? e.message : e); }

    console.log('[WITHDRAWAL] Recording transaction');
    await client.query(
      'INSERT INTO transactions(user_id, type, amount, currency, status, reference, created_at) VALUES($1,$2,$3,$4,$5,$6,NOW())',
      [userId, 'withdrawal', amt, crypto_type.toUpperCase(), 'pending', `withdrawal-${withdrawalResult.rows[0].id}`]
    );

    await client.query('COMMIT');
    console.log('[WITHDRAWAL] ✓ Committed successfully');

    // Emit profile update to user's SSE stream so clients update immediately
    try { sse.emit(userId, 'profile_update', { userId, balance: newBalance, type: 'withdrawal' }); } catch(e){ /* ignore */ }

    const withdrawal = withdrawalResult.rows[0];
    res.status(201).json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: amt,
        crypto_type: crypto_type.toUpperCase(),
        status: withdrawal.status,
        created_at: withdrawal.created_at,
        fee_amount: withdrawal.fee_amount,
        fee_status: withdrawal.fee_status,
        balance_snapshot: withdrawal.balance_snapshot,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[WITHDRAWAL] ✗ Creation error:', err && err.stack ? err.stack : err);
    // Return helpful details in dev so it's easier to debug (will not expose sensitive data in prod)
    res.status(500).json({ error: 'Failed to create withdrawal request', details: err && err.message ? err.message : String(err) });
  } finally {
    client.release();
  }
});

// GET: Retrieve withdrawal status by ID
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const result = await db.query(
      `SELECT id, amount, crypto_type, crypto_address, status, txn_hash, error_message, created_at, processed_at,
              fee_amount, fee_status, balance_snapshot
       FROM withdrawals WHERE id=$1 AND user_id=$2`,
      [id, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    const withdrawal = result.rows[0];
    console.log('[GET WITHDRAWAL] Returning withdrawal:', { id, fee_status: withdrawal.fee_status, status: withdrawal.status });
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
      `SELECT id, amount, crypto_type, status, created_at, processed_at, fee_amount, fee_status
       FROM withdrawals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    res.json({ success: true, withdrawals: result.rows });
  } catch (err) {
    console.error('Withdrawals list error:', err);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// User marks fee as submitted (acknowledges payment)
router.post('/:id/fee-submitted', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  try {
    const result = await db.query(
      `UPDATE withdrawals
       SET fee_status='submitted'
       WHERE id=$1 AND user_id=$2
       RETURNING id, fee_status`,
      [id, userId]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    console.log('[FEE SUBMITTED] Withdrawal:', id, 'Status:', result.rows[0].fee_status);
    res.json({ success: true, withdrawal: result.rows[0] });
  } catch (err) {
    console.error('Fee submit error:', err.message || err);
    res.status(500).json({ error: 'Failed to submit fee', details: err.message });
  }
});

module.exports = router;
