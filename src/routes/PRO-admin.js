const express = require('express');
const router = express.Router();
const db = require('../db');
const sse = require('../sse/broadcaster');
const { recordLossIfApplicable } = require('../services/balanceChanges');

// Admin credit endpoint — protected by an ADMIN_KEY header (x-admin-key)
// POST /api/admin/credit
// body: { userId?, email?, amount, currency?, reference? }

// Read ADMIN_KEY dynamically (checks both ADMIN_KEY and ADMIN_API_KEY for compatibility)
function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || null;
}

router.post('/credit', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const { userId, email, amount, currency = 'USD', reference = 'admin-credit' } = req.body;
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Find user and lock row
      let userRes;
      if (userId) {
        userRes = await client.query('SELECT id, balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
      } else if (email) {
        userRes = await client.query('SELECT id, balance FROM users WHERE email=$1 FOR UPDATE', [email]);
      } else {
        throw new Error('userId or email required');
      }

      if (!userRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const uid = userRes.rows[0].id;
      const curr = (currency || 'USD').toString().toUpperCase();

      // Insert transaction record
      const txRes = await client.query(
        'INSERT INTO transactions(user_id, type, amount, currency, status, reference, created_at) VALUES($1,$2,$3,$4,$5,$6,NOW()) RETURNING id, created_at',
        [uid, 'deposit', amt, curr, 'completed', reference]
      );

      // If USD, update users.balance, otherwise update portfolio balance column
      const cryptoColumns = { BTC: 'btc_balance', ETH: 'eth_balance', USDT: 'usdt_balance', USDC: 'usdc_balance' };
      if (curr === 'USD') {
        await client.query('UPDATE users SET balance = COALESCE(balance,0) + $1, portfolio_value = portfolio_value + $1, updated_at = NOW() WHERE id=$2', [amt, uid]);
      } else if (cryptoColumns[curr]) {
        const col = cryptoColumns[curr];
        // Upsert into portfolio (create row if missing)
        await client.query(
          `INSERT INTO portfolio(user_id, ${col}, updated_at) VALUES($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET ${col} = COALESCE(portfolio.${col},0) + $2, updated_at = NOW()`,
          [uid, amt]
        );
      } else {
        // Unknown currency — still accept transaction but do not modify balances
        console.warn('Admin credit for unsupported currency:', curr);
      }

      // write admin audit
      try {
        await client.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [provided, 'credit', JSON.stringify({ userId: uid, amount: amt, currency: curr, reference })]);
      } catch (ea) { console.warn('Failed to write admin audit', ea.message || ea); }

      await client.query('COMMIT');
      // notify any connected clients for this user
      try { sse.emit(uid, 'profile_update', { userId: uid, type: 'credit', amount: amt, currency: curr }); } catch(e){/*ignore*/}
      return res.json({ success: true, txId: txRes.rows[0].id, created_at: txRes.rows[0].created_at });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Admin credit failed:', err.message || err);
      return res.status(500).json({ error: err.message || 'credit failed' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Admin route error:', err.message || err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

// GET /api/admin/users - list users (admin key required) - PRO ADMIN VERSION
router.get('/users-pro', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const q = await db.query('SELECT id, email, COALESCE(balance,0) as balance, created_at FROM users ORDER BY id LIMIT 500');
    // Return directly as array for frontend compatibility
    return res.json(q.rows);
  } catch (err) {
    console.error('Admin users list error:', err.message || err);
    return res.status(500).json({ error: 'failed to list users' });
  }
});

// GET /api/admin/users/:id - get single user
router.get('/users/:id', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'invalid user id' });

    const q = await db.query('SELECT id, email, COALESCE(balance,0) as balance, created_at FROM users WHERE id=$1', [userId]);
    return res.json(q.rows[0] || null);
  } catch (err) {
    console.error('Admin get user error:', err.message || err);
    return res.status(500).json({ error: 'failed to fetch user' });
  }
});

// GET /api/admin/users/:id/transactions - list transactions for a specific user
router.get('/users/:id/transactions', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'invalid user id' });

    const q = await db.query('SELECT id, type, amount, currency, status, reference, created_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200', [userId]);
    return res.json({ success: true, transactions: q.rows });
  } catch (err) {
    console.error('Admin user transactions error:', err.message || err);
    return res.status(500).json({ error: 'failed to list transactions' });
  }
});

// POST /api/admin/users/:id/set-balance { amount }
router.post('/users/:id/set-balance', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(req.params.id, 10);
    const { amount } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(userId)) return res.status(400).json({ error: 'invalid user id' });
    if (!amt || isNaN(amt)) return res.status(400).json({ error: 'invalid amount' });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      // Read current balance under lock
      const cur = await client.query('SELECT COALESCE(balance,0) as balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const oldBalance = cur.rows.length ? parseFloat(cur.rows[0].balance) : 0;

      await client.query('UPDATE users SET balance = $1, portfolio_value = $1, updated_at = NOW() WHERE id=$2', [amt, userId]);

      // If balance decreased, record trading loss if applicable
      try { await recordLossIfApplicable(client, userId, oldBalance, amt); } catch (e) { console.warn('[PRO-admin] failed to record loss', e && e.message ? e.message : e); }

      await client.query('INSERT INTO transactions(user_id, type, amount, currency, status, reference, created_at) VALUES($1,$2,$3,$4,$5,$6,NOW())', [userId, 'adjustment', amt - oldBalance, 'USD', 'completed', 'admin-set-balance']);
      try { await client.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [provided, 'set-balance', JSON.stringify({ userId, amount: amt })]); } catch(ea){ console.warn('Failed to write audit', ea.message||ea); }
      await client.query('COMMIT');
      try { sse.emit(userId, 'profile_update', { userId, type: 'set-balance', balance: amt }); } catch(e){/*ignore*/}
      return res.json({ success: true, userId, balance: amt });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Set balance failed:', err.message || err);
      return res.status(500).json({ error: err.message || 'failed to set balance' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Set balance route error:', err.message || err);
    return res.status(500).json({ error: 'server error' });
  }
});

// POST /api/admin/users/:id/set-portfolio { assets: {BTC:1.2, ETH:0.3, ...} }
router.post('/users/:id/set-portfolio', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(req.params.id, 10);
    const { assets } = req.body; // object map symbol->amount
    if (isNaN(userId)) return res.status(400).json({ error: 'invalid user id' });
    if (!assets || typeof assets !== 'object') return res.status(400).json({ error: 'invalid assets' });

    // Map known symbols to columns
    const colMap = { BTC: 'btc_balance', ETH: 'eth_balance', USDT: 'usdt_balance', USDC: 'usdc_balance', XRP: 'xrp_balance', ADA: 'ada_balance' };
    const cols = [];
    const vals = [];
    for (const sym of Object.keys(colMap)) {
      const col = colMap[sym];
      const val = parseFloat(assets[sym]) || 0;
      cols.push(`${col} = $${cols.length + 1}`);
      vals.push(val);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      // Upsert portfolio row
      const upsertCols = Object.values(colMap).map((c, idx) => `${c} = $${idx+1}`).join(', ');
      // Ensure portfolio row exists
      await client.query(`INSERT INTO portfolio(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
      await client.query(`UPDATE portfolio SET ${upsertCols}, updated_at = NOW() WHERE user_id = $${vals.length + 1}`, [...vals, userId]);
        // write admin audit
        try { await client.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [provided, 'set-portfolio', JSON.stringify({ userId, assets })]); } catch(ea){ console.warn('Failed to write audit', ea.message||ea); }
        await client.query('COMMIT');
        try { sse.emit(userId, 'profile_update', { userId, type: 'set-portfolio', assets }); } catch(e){/*ignore*/}
        return res.json({ success: true, userId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Set portfolio failed:', err.message || err);
      return res.status(500).json({ error: err.message || 'failed to set portfolio' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Set portfolio route error:', err.message || err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
});

// GET /api/admin/users/:id/portfolio - return portfolio row
router.get('/users/:id/portfolio', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'invalid user id' });

    const q = await db.query('SELECT btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance, usd_value, updated_at FROM portfolio WHERE user_id=$1', [userId]);
    const portfolio = q.rows[0];
    
    // Convert to assets format expected by frontend
    const assets = {};
    if (portfolio) {
      if (portfolio.btc_balance) assets.BTC = parseFloat(portfolio.btc_balance);
      if (portfolio.eth_balance) assets.ETH = parseFloat(portfolio.eth_balance);
      if (portfolio.usdt_balance) assets.USDT = parseFloat(portfolio.usdt_balance);
      if (portfolio.usdc_balance) assets.USDC = parseFloat(portfolio.usdc_balance);
      if (portfolio.xrp_balance) assets.XRP = parseFloat(portfolio.xrp_balance);
      if (portfolio.ada_balance) assets.ADA = parseFloat(portfolio.ada_balance);
    }
    
    return res.json({ assets });
  } catch (err) {
    console.error('Admin get portfolio error:', err.message || err);
    return res.status(500).json({ error: err.message || 'failed to fetch portfolio' });
  }
});

// GET /api/admin/transactions - list all transactions (admin key required)
router.get('/transactions', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const q = await db.query('SELECT id, user_id, type, amount, currency, status, reference, created_at FROM transactions ORDER BY created_at DESC LIMIT 500');
    // Map to format expected by frontend
    const transactions = q.rows.map(t => ({
      id: t.id,
      user: t.user_id,
      type: t.type,
      amount: parseFloat(t.amount),
      status: t.status,
      method: t.currency,
      date: t.created_at,
      txid: t.reference
    }));
    return res.json(transactions);
  } catch (err) {
    console.error('Admin transactions list error:', err.message || err);
    return res.status(500).json({ error: 'failed to list transactions' });
  }
});

// POST /api/admin/transactions - create or update transaction
router.post('/transactions', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const { user, type, amount, status, date, method } = req.body;
    if (!user || !type || !amount) return res.status(400).json({ error: 'Missing required fields' });

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO transactions(user_id, type, amount, currency, status, reference, created_at) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at',
        [user, type, amount, method || 'USD', status || 'pending', `manual-admin-${Date.now()}`, date || 'NOW()']
      );
      await client.query('COMMIT');
      return res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create transaction error:', err.message || err);
    return res.status(500).json({ error: 'failed to create transaction' });
  }
});

// DELETE /api/admin/transactions/:id - delete transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const txId = parseInt(req.params.id, 10);
    if (isNaN(txId)) return res.status(400).json({ error: 'invalid transaction id' });

    const result = await db.query('DELETE FROM transactions WHERE id=$1', [txId]);
    return res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('Delete transaction error:', err.message || err);
    return res.status(500).json({ error: 'failed to delete transaction' });
  }
});

// GET /api/admin/testimonies - list all testimonies (admin key required)
router.get('/testimonies', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const q = await db.query('SELECT id, user_id, message, approved, created_at FROM testimonies ORDER BY created_at DESC LIMIT 500');
    // Map to format expected by frontend
    const testimonies = q.rows.map(t => ({
      id: t.id,
      user: t.user_id,
      message: t.message,
      approved: t.approved,
      date: t.created_at
    }));
    return res.json(testimonies);
  } catch (err) {
    console.error('Admin testimonies list error:', err.message || err);
    return res.status(500).json({ error: 'failed to list testimonies' });
  }
});

// POST /api/admin/testimonies/:id/approve - approve testimony
router.post('/testimonies/:id/approve', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid testimony id' });

    const result = await db.query('UPDATE testimonies SET approved = true WHERE id=$1', [id]);
    return res.json({ success: true, updated: result.rowCount });
  } catch (err) {
    console.error('Approve testimony error:', err.message || err);
    return res.status(500).json({ error: 'failed to approve testimony' });
  }
});

// DELETE /api/admin/testimonies/:id - delete testimony
router.delete('/testimonies/:id', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid testimony id' });

    const result = await db.query('DELETE FROM testimonies WHERE id=$1', [id]);
    return res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('Delete testimony error:', err.message || err);
    return res.status(500).json({ error: 'failed to delete testimony' });
  }
});

module.exports = router;
