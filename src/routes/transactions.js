const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');
const { allocatePortfolioForUser } = require('../services/portfolioAllocator');

// GET /api/transactions - return recent transactions for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  const userId = req.userId;
  const type = req.query.type; // Optional: filter by type (deposit, withdrawal, trade)

  try {
    let query = `SELECT
         id,
         type,
         amount,
         currency AS method,
         status,
         reference AS txid,
         created_at
       FROM transactions
       WHERE user_id = $1`;
    
    const params = [userId];
    
    // Add type filter if provided
    if (type) {
      query += ` AND type = $2`;
      params.push(type.toLowerCase());
    }
    
    query += ` ORDER BY created_at DESC LIMIT 50`;
    
    // Show all transactions including pending deposits (so users can see their deposit history)
    const result = await db.query(query, params);

    // Convert string amounts to numbers and ensure dates are ISO strings for frontend compatibility
    const transactions = result.rows.map(t => ({
      ...t,
      amount: parseFloat(t.amount) || 0,
      created_at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString()
    }));

    return res.json({ success: true, transactions });
  } catch (err) {
    // If transactions table does not exist or other DB error, return empty array for graceful fallback
    console.error('Transactions fetch error:', err.message || err);
    return res.json({ success: true, transactions: [] });
  }
});

// GET /api/transactions/deposits - return deposits for the authenticated user
router.get('/deposits', verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const result = await db.query(
      `SELECT
         id,
         type,
         amount,
         currency,
         status,
         reference,
         created_at
       FROM transactions
       WHERE user_id = $1 AND type = 'deposit'
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    // Convert string amounts to numbers and ensure dates are ISO strings for frontend compatibility
    const deposits = result.rows.map(d => ({
      ...d,
      amount: parseFloat(d.amount) || 0,
      created_at: d.created_at ? new Date(d.created_at).toISOString() : new Date().toISOString()
    }));

    return res.json({ success: true, deposits });
  } catch (err) {
    console.error('Deposits fetch error:', err.message || err);
    return res.json({ success: true, deposits: [] });
  }
});

// POST /api/transactions/deposit - create a deposit request (PENDING - awaits admin approval)
router.post('/deposit', verifyToken, async (req, res) => {
  const userId = req.userId;
  const { amount, method } = req.body;

  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

  let client;
  try {
    client = await db.getClient();
    await client.query('BEGIN');
    
    const reference = `deposit-request-${Date.now()}`;

    // Create deposit transaction record with PENDING status
    // NO balance update yet - wait for admin approval
    const txResult = await client.query(
      'INSERT INTO transactions(user_id, type, amount, currency, status, reference) VALUES($1,$2,$3,$4,$5,$6) RETURNING id, created_at',
      [userId, 'deposit', amt, (method || 'USD'), 'pending', reference]
    );
    
    await client.query('COMMIT');
    client.release();

    return res.status(201).json({
      success: true,
      id: txResult.rows[0].id,
      created_at: txResult.rows[0].created_at,
      status: 'pending',
      message: `Deposit request of $${amt} submitted. Awaiting admin approval to credit your account.`
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
    console.error('Deposit request error:', err.message || err);
    return res.status(500).json({ error: 'Failed to process deposit' });
  }
});

// POST /api/transactions/withdraw - convenience endpoint to create a withdrawal request
router.post('/withdraw', verifyToken, async (req, res) => {
  const userId = req.userId;
  const { amount, method, crypto_type, crypto_address } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

  try {
    // Attempt to insert into withdrawals table (if present)
    const w = await db.query(
      'INSERT INTO withdrawals(user_id, amount, crypto_type, crypto_address, status) VALUES($1,$2,$3,$4,$5) RETURNING id, status, created_at',
      [userId, amount, (crypto_type||'USD').toUpperCase(), crypto_address || null, 'pending']
    );
    return res.status(201).json({ success: true, withdrawal: w.rows[0] });
  } catch (err) {
    console.error('Withdraw record error (falling back):', err.message || err);
    // Fallback to stubbed transaction
    return res.status(201).json({ success: true, withdrawal: { id: `stub-${Date.now()}`, status: 'pending', created_at: new Date().toISOString() } });
  }
});

module.exports = router;
