const express = require('express');
const router = express.Router();
const db = require('../db');
const sse = require('../sse/broadcaster');

// Admin credit endpoint — protected by an ADMIN_KEY header (x-admin-key)
// POST /api/admin/credit
// body: { userId?, email?, amount, currency?, reference? }

// Read ADMIN_KEY dynamically (checks both ADMIN_KEY and ADMIN_API_KEY for compatibility)
function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || null;
}

const { allocatePortfolioForUser } = require('../services/portfolioAllocator');
const { recordLossIfApplicable } = require('../services/balanceChanges');

function requireAdminKey(req, res) {
  const provided = req.headers['x-admin-key'];
  const ADMIN_KEY = getAdminKey();
  if (!ADMIN_KEY) return { ok: false, code: 503, msg: 'Admin API key not configured on server' };
  if (!provided || provided !== ADMIN_KEY) return { ok: false, code: 403, msg: 'Forbidden' };
  return { ok: true };
}

router.get('/verify-key', (req, res) => {
  const provided = req.headers['x-admin-key'];
  const ADMIN_KEY = getAdminKey();
  if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
  if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key' });
  return res.json({ success: true });
});

// -------------------------------
// Simulator controls
// -------------------------------
router.get('/users/:id/simulator', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  const { rows } = await db.query('SELECT sim_enabled, sim_paused, sim_next_run_at, sim_last_run_at, sim_started_at, balance FROM users WHERE id=$1', [uid]);
  if (!rows.length) return res.status(404).json({ error: 'user not found' });
  return res.json({ success: true, simulator: rows[0] });
});

router.post('/users/:id/simulator/start', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  const delayMinutes = Number(req.body.delayMinutes || 5);
  const next = delayMinutes <= 0 ? 'NOW()' : `NOW() + interval '${delayMinutes} minutes'`;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    // Lock and read current balance for allocation
    const ures = await client.query('SELECT id, COALESCE(balance,0) AS balance FROM users WHERE id=$1 FOR UPDATE', [uid]);
    if (!ures.rows.length) { await client.query('ROLLBACK'); client.release(); return res.status(404).json({ error: 'user not found' }); }
    const bal = Number(ures.rows[0].balance) || 0;

    await client.query(
      `UPDATE users
         SET sim_enabled=TRUE,
             sim_paused=FALSE,
             sim_next_run_at=${next},
             sim_started_at = COALESCE(sim_started_at, NOW()),
             updated_at=NOW()
       WHERE id=$1`,
      [uid]
    );

    // Allocate portfolio once on simulator start to reflect current balance
    try { await allocatePortfolioForUser(uid, bal, { client }); } catch (e) { console.warn('Allocate portfolio on simulator start failed', e.message || e); }

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(()=>{});
    console.error('Simulator start failed:', err.message || err);
    return res.status(500).json({ error: 'failed to start simulator' });
  } finally {
    client.release();
  }
});

router.post('/users/:id/simulator/pause', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  await db.query(`UPDATE users SET sim_paused=TRUE, updated_at=NOW() WHERE id=$1`, [uid]);
  return res.json({ success: true });
});

// Trigger manual balance growth for a single user
router.post('/users/:id/simulator/trigger-growth', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });

  try {
    const { manualRun } = require('../jobs/balanceGrowthSimulator');
    await manualRun(uid);
    return res.json({ success: true, message: `Balance growth triggered for user ${uid}` });
  } catch (err) {
    console.error('Failed to trigger balance growth:', err);
    return res.status(500).json({ error: 'failed to trigger balance growth', details: err.message });
  }
});

// Update user balance directly (admin override)
router.post('/users/:id/balance/update', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  
  const { amount, reason = 'admin override', tax_id } = req.body;
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const newBalance = parseFloat(amount);
  if (isNaN(newBalance)) {
    return res.status(400).json({ error: 'invalid amount' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get current balance
    const current = await client.query('SELECT balance FROM users WHERE id=$1 FOR UPDATE', [uid]);
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'user not found' });
    }

    const oldBalance = parseFloat(current.rows[0].balance);

    // Update balance and optionally tax_id
    let updateQuery = 'UPDATE users SET balance=$1, updated_at=NOW()';
    const params = [newBalance];
    let paramIndex = 2;
    
    if (tax_id) {
      updateQuery += `, tax_id=$${paramIndex}`;
      params.push(tax_id);
      paramIndex++;
    }
    
    updateQuery += ` WHERE id=$${paramIndex}`;
    params.push(uid);
    
    await client.query(updateQuery, params);

    // If balance decreased, record trading loss if applicable
    try { await recordLossIfApplicable(client, uid, oldBalance, newBalance); } catch (e) { console.warn('[admin] failed to record loss', e && e.message ? e.message : e); }

    // Log transaction for audit
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, reference)
       VALUES ($1, 'adjustment', $2, 'USD', 'completed', $3)`,
      [uid, newBalance - oldBalance, `admin: ${reason}`]
    );

    await client.query('COMMIT');

    // Notify connected clients
    try { sse.emit(uid, 'profile_update', { userId: uid, type: 'admin_adjust', balance: newBalance }); } catch(e){/*ignore*/}

    return res.json({
      success: true,
      message: `Balance updated from $${oldBalance.toFixed(2)} to $${newBalance.toFixed(2)}` + (tax_id ? ` (Tax ID: ${tax_id})` : ''),
      user: { id: uid, balance: newBalance, oldBalance, tax_id }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to update balance:', err);
    return res.status(500).json({ error: 'failed to update balance', details: err.message });
  } finally {
    client.release();
  }
});

// Get balance growth trades for a user (filtered by is_simulated)
router.get('/users/:id/growth-trades', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  
  const limit = parseInt(req.query.limit || 50, 10);

  try {
    const { rows } = await db.query(
      `SELECT id, user_id, type, asset, amount, price, total, balance_before, balance_after, 
              status, is_simulated, created_at
       FROM trades 
       WHERE user_id=$1 AND is_simulated=true
       ORDER BY created_at DESC
       LIMIT $2`,
      [uid, limit]
    );

    return res.json({ success: true, trades: rows, count: rows.length });
  } catch (err) {
    console.error('Failed to fetch growth trades:', err);
    return res.status(500).json({ error: 'failed to fetch trades', details: err.message });
  }
});

// Get balance growth stats for a user
router.get('/users/:id/growth-stats', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });

  try {
    const user = await db.query('SELECT id, balance, sim_enabled, sim_paused, sim_last_run_at, created_at FROM users WHERE id=$1', [uid]);
    if (!user.rows.length) return res.status(404).json({ error: 'user not found' });

    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_trades,
        SUM(CAST(total AS NUMERIC)) as total_volume,
        AVG(CAST(balance_after AS NUMERIC) - CAST(balance_before AS NUMERIC)) as avg_boost,
        MAX(CAST(balance_after AS NUMERIC)) as peak_balance,
        MIN(CAST(balance_before AS NUMERIC)) as lowest_balance
       FROM trades
       WHERE user_id=$1 AND is_simulated=true`,
      [uid]
    );

    return res.json({
      success: true,
      user: user.rows[0],
      stats: stats.rows[0]
    });
  } catch (err) {
    console.error('Failed to fetch growth stats:', err);
    return res.status(500).json({ error: 'failed to fetch stats', details: err.message });
  }
});

// -------------------------------
// Deposit approval (auto-start simulator on first approved deposit)
// -------------------------------
router.get('/deposits', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const { status } = req.query;
  const where = ['type = \'deposit\''];
  const params = [];
  if (status) {
    params.push(status);
    where.push('status = $1');
  }
  const sql = `SELECT id, user_id, amount, currency, status, reference, created_at FROM transactions WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 200`;
  const { rows } = await db.query(sql, params);
  return res.json({ success: true, deposits: rows });
});

router.post('/deposits/:id/approve', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const txId = parseInt(req.params.id, 10);
  if (isNaN(txId)) return res.status(400).json({ error: 'invalid transaction id' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const tx = await client.query('SELECT id, user_id, amount, currency, status FROM transactions WHERE id=$1 AND type=\'deposit\' FOR UPDATE', [txId]);
    if (!tx.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'deposit not found' });
    }
    const row = tx.rows[0];
    if (row.status === 'completed') {
      await client.query('ROLLBACK');
      return res.json({ success: true, already: true });
    }

    await client.query('UPDATE transactions SET status=\'completed\', reference=\'deposit\', updated_at=NOW() WHERE id=$1', [txId]);
    await client.query('UPDATE users SET balance = COALESCE(balance,0) + $1, updated_at=NOW() WHERE id=$2', [row.amount, row.user_id]);

    const first = await client.query('SELECT COUNT(*)::int AS cnt FROM transactions WHERE user_id=$1 AND type=\'deposit\' AND status=\'completed\'', [row.user_id]);
    const isFirst = (first.rows[0].cnt || 0) === 0;
    if (isFirst) {
      await client.query(
        `UPDATE users
           SET sim_enabled=TRUE,
               sim_paused=FALSE,
               sim_next_run_at = NOW() + interval '5 minutes',
               sim_started_at = COALESCE(sim_started_at, NOW()),
               updated_at=NOW()
         WHERE id=$1`,
        [row.user_id]
      );
      try { await allocatePortfolioForUser(row.user_id, Number(row.amount) || 0, { client }); } catch (e) { console.warn('initial portfolio allocate failed', e.message||e); }
    }

    await client.query('COMMIT');
    return res.json({ success: true, firstDeposit: isFirst });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve deposit failed:', err.message || err);
    return res.status(500).json({ error: 'failed to approve deposit' });
  } finally {
    client.release();
  }
});

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
        await client.query('UPDATE users SET balance = COALESCE(balance,0) + $1, updated_at = NOW() WHERE id=$2', [amt, uid]);
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

// GET /api/admin/users - list users (admin key required)
// GET /api/admin/debug - Check if admin key is configured (no auth needed for debugging)
router.get('/debug', (req, res) => {
  const ADMIN_KEY = getAdminKey();
  res.json({ 
    adminKeySet: !!ADMIN_KEY,
    adminKeyLength: ADMIN_KEY ? ADMIN_KEY.length : 0,
    adminKeyPreview: ADMIN_KEY ? `${ADMIN_KEY.substring(0,5)}...${ADMIN_KEY.substring(ADMIN_KEY.length-5)}` : 'NOT SET'
  });
});

router.get('/users', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    console.log('[Admin] GET /users - Admin key check');
    console.log('[Admin] Provided key:', provided ? `"${provided.substring(0,5)}..."` : 'MISSING');
    console.log('[Admin] Expected key:', ADMIN_KEY ? `"${ADMIN_KEY.substring(0,5)}..."` : 'NOT SET');
    
    if (!ADMIN_KEY) {
      console.error('[Admin] CRITICAL: ADMIN_KEY not configured in environment');
      return res.status(503).json({ error: 'Admin API key not configured on server' });
    }
    
    if (!provided) {
      console.warn('[Admin] No key provided in request');
      return res.status(403).json({ error: 'Missing x-admin-key header' });
    }
    
    if (provided !== ADMIN_KEY) {
      console.warn('[Admin] Key mismatch - access denied');
      return res.status(403).json({ error: 'Invalid admin key' });
    }

    console.log('[Admin] Key valid, fetching users...');
    const q = await db.query('SELECT id, email, COALESCE(balance,0) as balance, COALESCE(is_active,TRUE) AS is_active, created_at FROM users ORDER BY id LIMIT 500');
    console.log(`[Admin] Returning ${q.rows.length} users`);
    
    // Return as direct array for consistency with PRO-admin version
    return res.json(q.rows);
  } catch (err) {
    console.error('Admin users list error:', err.message || err);
    return res.status(500).json({ error: 'failed to list users' });
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
    // Lock and get old balance for loss detection
    const ures = await client.query('SELECT COALESCE(balance,0) AS balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!ures.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'user not found' }); }
    const oldBalance = Number(ures.rows[0].balance) || 0;

    await client.query('UPDATE users SET balance = $1, updated_at = NOW() WHERE id=$2', [amt, userId]);
    await client.query('INSERT INTO transactions(user_id, type, amount, currency, status, reference, created_at) VALUES($1,$2,$3,$4,$5,$6,NOW())', [userId, 'adjustment', amt, 'USD', 'completed', 'admin-set-balance']);

    // Record loss entry if applicable (user has no tax_id and balance decreased)
    try { await recordLossIfApplicable(client, userId, oldBalance, amt); } catch(e){ console.warn('Failed to record loss on set-balance', e && e.message ? e.message : e); }

      try { await client.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [provided, 'set-balance', JSON.stringify({ userId, amount: amt })]); } catch(ea){ console.warn('Failed to write audit', ea.message||ea); }
      await client.query('COMMIT');
      try { sse.emit(userId, 'profile_update', { userId, type: 'set-balance', balance: amt }); } catch(e){/*ignore*/}
      return res.json({ success: true, userId, balance: amt });
    } catch (err) {
      await client.query('ROLLBACK');
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

// GET /api/admin/users/:id/portfolio - return portfolio with live prices (consistent with user endpoint)
router.get('/users/:id/portfolio', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'invalid user id' });

    // Get portfolio with live prices (consistent with user endpoint)
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });

    const portfolioRes = await db.query('SELECT btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance, usd_value, updated_at FROM portfolio WHERE user_id = $1', [userId]);
    const portfolio = portfolioRes.rows[0] || {};

    // Fetch live prices from CoinGecko
    let prices = { 'BTC': 45000, 'ETH': 2500, 'USDT': 1.0, 'USDC': 1.0, 'XRP': 2.5, 'ADA': 0.8 };
    try {
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,ripple,cardano&vs_currencies=usd';
      const res = await fetch(url, { timeout: 10000 });
      if (res.ok) {
        const data = await res.json();
        prices = {
          'BTC': data.bitcoin?.usd || 45000,
          'ETH': data.ethereum?.usd || 2500,
          'USDT': data.tether?.usd || 1.0,
          'USDC': data['usd-coin']?.usd || 1.0,
          'XRP': data.ripple?.usd || 2.5,
          'ADA': data.cardano?.usd || 0.8,
        };
      }
    } catch (err) { console.warn('[Admin Portfolio] CoinGecko fetch failed, using fallback prices'); }

    // Build consistent response format (same as user endpoint)
    const coins = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
    const columns = ['btc_balance', 'eth_balance', 'usdt_balance', 'usdc_balance', 'xrp_balance', 'ada_balance'];
    const positions = [];
    let totalValue = 0;

    coins.forEach((coin, i) => {
      const amount = parseFloat(portfolio[columns[i]]) || 0;
      const price = prices[coin];
      const value = amount * price;
      if (amount > 0) {
        positions.push({ coin, amount: parseFloat(amount.toFixed(8)), price: parseFloat(price.toFixed(2)), value: parseFloat(value.toFixed(2)) });
        totalValue += value;
      }
    });

    return res.json({ success: true, portfolio: { positions, total_value: parseFloat(totalValue.toFixed(2)), user_balance: parseFloat(userRes.rows[0].balance || 0).toFixed(2), updated_at: portfolio.updated_at || new Date().toISOString() } });
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
    const transactions = q.rows.map(t => ({
      id: t.id,
      user: t.user_id,
      type: t.type,
      amount: parseFloat(t.amount),
      status: t.status,
      method: t.currency,
      date: t.created_at,
      txid: t.reference,
    }));
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error('Admin transactions list error:', err.message || err);
    return res.status(500).json({ error: 'failed to list transactions' });
  }
});

// --------------------------------
// User enable/disable/delete controls
// --------------------------------
router.post('/users/:id/disable', async (req, res) => {
  const guard = requireAdminKey(req, res); if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  try {
    await db.query('UPDATE users SET is_active=FALSE, deleted_at=NOW(), updated_at=NOW() WHERE id=$1', [uid]);
    try { await db.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [req.headers['x-admin-key'], 'disable-user', JSON.stringify({ userId: uid })]); } catch(e){/*ignore*/}
    return res.json({ success: true, userId: uid, disabled: true });
  } catch (err) { console.error('Disable user error:', err.message || err); return res.status(500).json({ error: 'failed to disable user' }); }
});

router.post('/users/:id/enable', async (req, res) => {
  const guard = requireAdminKey(req, res); if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  try {
    await db.query('UPDATE users SET is_active=TRUE, deleted_at=NULL, updated_at=NOW() WHERE id=$1', [uid]);
    try { await db.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [req.headers['x-admin-key'], 'enable-user', JSON.stringify({ userId: uid })]); } catch(e){/*ignore*/}
    return res.json({ success: true, userId: uid, enabled: true });
  } catch (err) { console.error('Enable user error:', err.message || err); return res.status(500).json({ error: 'failed to enable user' }); }
});

router.post('/users/:id/delete', async (req, res) => {
  const guard = requireAdminKey(req, res); if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const uid = parseInt(req.params.id, 10);
  if (isNaN(uid)) return res.status(400).json({ error: 'invalid user id' });
  try {
    // Soft delete to preserve history
    await db.query('UPDATE users SET is_active=FALSE, deleted_at=NOW(), updated_at=NOW() WHERE id=$1', [uid]);
    try { await db.query('INSERT INTO admin_audit(admin_key, action, details) VALUES($1,$2,$3)', [req.headers['x-admin-key'], 'delete-user', JSON.stringify({ userId: uid })]); } catch(e){/*ignore*/}
    return res.json({ success: true, userId: uid, deleted: true });
  } catch (err) { console.error('Delete user error:', err.message || err); return res.status(500).json({ error: 'failed to delete user' }); }
});

// -------------------------------
// Admin prompts: create and list
// -------------------------------
router.post('/prompts', async (req, res) => {
  const guard = requireAdminKey(req, res); if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  const { userIds, message } = req.body;
  if (!message || String(message).trim() === '') return res.status(400).json({ error: 'message required' });
  try {
    console.log('Creating prompt:', { userIds, messageLength: message.length });
    // If userIds is an array, insert per user; if absent or empty, insert broadcast (user_id NULL)
    if (Array.isArray(userIds) && userIds.length) {
      const ids = userIds.map(i => parseInt(i, 10)).filter(n => !isNaN(n));
      for (const u of ids) {
        await db.query('INSERT INTO admin_prompts(user_id, message) VALUES($1,$2)', [u, message]);
      }
      console.log('Created prompts for users:', ids);
      return res.json({ success: true, created: ids.length });
    }
    await db.query('INSERT INTO admin_prompts(user_id, message) VALUES(NULL,$1)', [message]);
    console.log('Created broadcast prompt');
    return res.json({ success: true, created: 1, broadcast: true });
  } catch (err) { 
    console.error('Create prompt failed:', err.message || err); 
    return res.status(500).json({ error: 'failed to create prompt: ' + (err.message || err) }); 
  }
});

router.get('/prompts', async (req, res) => {
  const guard = requireAdminKey(req, res); if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });
  try {
    const q = await db.query('SELECT id, user_id, message, created_at, is_active FROM admin_prompts ORDER BY created_at DESC LIMIT 200');
    return res.json({ success: true, prompts: q.rows });
  } catch (err) { console.error('List prompts failed:', err.message || err); return res.status(500).json({ error: 'failed to list prompts' }); }
});


// POST /api/admin/transactions - create new transaction (manual admin entry)
router.post('/transactions', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    const ADMIN_KEY = getAdminKey();
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const { user, type, amount, status, method, date } = req.body;
    const userId = parseInt(user, 10);
    const amt = parseFloat(amount);

    if (!user || isNaN(userId)) return res.status(400).json({ error: 'Invalid user id' });
    if (!type) return res.status(400).json({ error: 'Missing transaction type' });
    if (!amt || isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // Optional custom created_at timestamp for admin-created rows
    let createdAt = null;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) createdAt = d;
    }
    if (!createdAt) createdAt = new Date();

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO transactions(user_id, type, amount, currency, status, reference, created_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at',
        [userId, type, amt, method || 'USD', status || 'pending', `manual-admin-${Date.now()}`, createdAt]
      );
      await client.query('COMMIT');
      return res.json({ success: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Create transaction error:', err.message || err);
      return res.status(500).json({ error: 'failed to create transaction' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Create transaction route error:', err.message || err);
    return res.status(500).json({ error: 'server error' });
  }
});

// -------------------------------
// Withdrawal fee confirmations
// -------------------------------
router.get('/withdrawals', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const { fee_status } = req.query;
    const where = fee_status ? 'WHERE fee_status = $1' : '';
    const params = fee_status ? [fee_status] : [];
    const q = await db.query(`SELECT * FROM withdrawals ${where} ORDER BY created_at DESC`, params);
    return res.json({ success: true, withdrawals: q.rows });
  } catch (err) {
    console.error('Admin list withdrawals error:', err.message || err);
    return res.status(500).json({ error: 'failed to list withdrawals' });
  }
});

router.post('/withdrawals/:id/confirm-fee', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    console.log('[CONFIRM FEE] Request received for withdrawal:', req.params.id);
    console.log('[CONFIRM FEE] Admin key provided:', !!provided, 'Key length:', provided ? provided.length : 0);
    console.log('[CONFIRM FEE] Expected key:', ADMIN_KEY ? ADMIN_KEY.substring(0, 5) + '...' : 'NOT SET');
    
    if (!ADMIN_KEY) {
      console.error('[CONFIRM FEE] Admin API key not configured');
      return res.status(503).json({ error: 'Admin API key not configured on server' });
    }
    if (!provided || provided !== ADMIN_KEY) {
      console.error('[CONFIRM FEE] Forbidden - key mismatch');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const confirmedBy = req.body.confirmedBy || 'admin';
    
    console.log('[CONFIRM FEE] Processing withdrawal:', id, 'confirmedBy:', confirmedBy);
    
    const result = await db.query(
      `UPDATE withdrawals
         SET fee_status='confirmed',
             status='processing',
             fee_confirmed_at=NOW(),
             fee_confirmed_by=$2
       WHERE id=$1
       RETURNING id, fee_status, status`,
      [id, confirmedBy]
    );
    
    if (!result.rows.length) {
      console.warn('[CONFIRM FEE] Withdrawal not found:', id);
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    console.log('[CONFIRM FEE] ✓ Updated:', result.rows[0]);
    return res.json({ success: true, withdrawal: result.rows[0] });
  } catch (err) {
    console.error('[CONFIRM FEE] Error:', err.message || err);
    return res.status(500).json({ error: 'failed to confirm fee', details: err.message });
  }
});

// PUT /api/admin/transactions/:id - update transaction fields
router.put('/transactions/:id', async (req, res) => {
  try {
    const provided = req.headers['x-admin-key'];
    if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin API key not configured on server' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });

    const txId = parseInt(req.params.id, 10);
    if (isNaN(txId)) return res.status(400).json({ error: 'invalid transaction id' });

    const { type, amount, status, method, date } = req.body;
    const amt = amount != null ? parseFloat(amount) : null;

    let createdAt = null;
    if (date) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) createdAt = d;
    }

    await db.query(
      'UPDATE transactions SET type = COALESCE($2,type), amount = COALESCE($3,amount), currency = COALESCE($4,currency), status = COALESCE($5,status), created_at = COALESCE($6, created_at), updated_at = NOW() WHERE id=$1',
      [txId, type || null, amt, method || null, status || null, createdAt]
    );

    return res.json({ success: true, id: txId });
  } catch (err) {
    console.error('Update transaction error:', err.message || err);
    return res.status(500).json({ error: 'failed to update transaction' });
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

// --------------------------------
// Clear all trades (for admin reset)
// --------------------------------
router.post('/trades/clear-all', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get count before deletion
    const countBefore = await client.query('SELECT COUNT(*) as total FROM trades');
    const deletedCount = countBefore.rows[0].total;

    // Delete all trades silently (no logging, no portfolio changes)
    await client.query('DELETE FROM trades');

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Cleared all ${deletedCount} trades`,
      deletedTrades: deletedCount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Clear trades error:', err.message || err);
    return res.status(500).json({ error: 'failed to clear trades', details: err.message });
  } finally {
    client.release();
  }
});

// POST /api/admin/deposits/:txId/approve - Approve a pending deposit
router.post('/deposits/:txId/approve', async (req, res) => {
  const guard = requireAdminKey(req, res);
  if (!guard.ok) return res.status(guard.code).json({ error: guard.msg });

  const txId = parseInt(req.params.txId, 10);
  if (isNaN(txId)) return res.status(400).json({ error: 'invalid transaction id' });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get the pending deposit transaction
    const txRes = await client.query(
      'SELECT id, user_id, type, amount, status, reference FROM transactions WHERE id = $1 FOR UPDATE',
      [txId]
    );

    if (!txRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'transaction not found' });
    }

    const tx = txRes.rows[0];
    if (tx.type !== 'deposit' || tx.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'only pending deposits can be approved' });
    }

    const userId = tx.user_id;
    const depositAmount = parseFloat(tx.amount);

    // Update transaction status to completed
    await client.query(
      'UPDATE transactions SET status = $1, reference = $2 WHERE id = $3',
      ['completed', 'deposit', txId]
    );

    // Get current user balance
    const userRes = await client.query(
      'SELECT COALESCE(balance, 0) as balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (!userRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'user not found' });
    }

    const oldBalance = parseFloat(userRes.rows[0].balance);
    const newBalance = oldBalance + depositAmount;

    // Update user balance
    await client.query(
      'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, userId]
    );

    await client.query('COMMIT');

    // Notify user of balance update
    try { sse.emit(userId, 'profile_update', { userId, type: 'deposit_approved', balance: newBalance, amount: depositAmount }); } catch(e){/*ignore*/}

    console.log(`[Admin] Approved deposit: txId=${txId}, userId=${userId}, amount=${depositAmount}, newBalance=${newBalance}`);

    return res.json({
      success: true,
      message: `Deposit approved: $${depositAmount.toFixed(2)} credited to user ${userId}`,
      transaction: { id: txId, type: tx.type, amount: depositAmount, status: 'completed' },
      user: { id: userId, newBalance }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve deposit failed:', err.message || err);
    return res.status(500).json({ error: 'failed to approve deposit', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
