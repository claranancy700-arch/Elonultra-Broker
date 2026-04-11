const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { verifyToken } = require('../middleware/auth');

// ── Bootstrap: ensure required columns / tables exist ────────────────────────
(async () => {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banking_details JSONB DEFAULT NULL`);
  } catch (e) {
    console.warn('[users] Could not add banking_details column:', e.message);
  }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_masked   VARCHAR(30) NOT NULL,
        key_hash     VARCHAR(64) NOT NULL,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      )
    `);
  } catch (e) {
    console.warn('[users] Could not create api_keys table:', e.message);
  }
})();

// ── GET /api/users/banking-details ───────────────────────────────────────────
router.get('/banking-details', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT banking_details FROM users WHERE id=$1', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    if (!rows[0].banking_details) return res.status(404).json({ error: 'No banking details saved yet' });
    res.json(rows[0].banking_details);
  } catch (err) {
    console.error('[users] GET banking-details:', err.message);
    res.status(500).json({ error: 'Failed to load banking details' });
  }
});

// ── PUT /api/users/banking-details ───────────────────────────────────────────
router.put('/banking-details', verifyToken, async (req, res) => {
  const allowed = ['country', 'acctNumber', 'acctName', 'personalId', 'branch', 'email'];
  const data = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = String(req.body[k]).trim(); });

  try {
    const { rowCount } = await db.query(
      'UPDATE users SET banking_details=$1 WHERE id=$2',
      [data, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[users] PUT banking-details:', err.message);
    res.status(500).json({ error: 'Failed to save banking details' });
  }
});

// ── GET /api/users/api-keys ──────────────────────────────────────────────────
router.get('/api-keys', verifyToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, key_masked AS "keyMasked", created_at AS "createdAt", last_used_at AS "lastUsedAt"
       FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[users] GET api-keys:', err.message);
    res.status(500).json({ error: 'Failed to load API keys' });
  }
});

// ── POST /api/users/api-keys ─────────────────────────────────────────────────
router.post('/api-keys', verifyToken, async (req, res) => {
  try {
    const rawKey = 'elu_' + crypto.randomBytes(24).toString('hex');
    const keyMasked = rawKey.slice(0, 12) + '...' + rawKey.slice(-4);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { rows } = await db.query(
      `INSERT INTO api_keys(user_id, key_masked, key_hash)
       VALUES($1,$2,$3)
       RETURNING id, key_masked AS "keyMasked", created_at AS "createdAt"`,
      [req.userId, keyMasked, keyHash]
    );
    // Return full raw key only once
    res.status(201).json({ ...rows[0], key: rawKey });
  } catch (err) {
    console.error('[users] POST api-keys:', err.message);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// ── DELETE /api/users/api-keys/:id ───────────────────────────────────────────
router.delete('/api-keys/:id', verifyToken, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid key id' });

  try {
    const { rowCount } = await db.query(
      'DELETE FROM api_keys WHERE id=$1 AND user_id=$2',
      [id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Key not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[users] DELETE api-keys:', err.message);
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

// ── PUT /api/users/preferences (store as JSONB on users row) ─────────────────
router.put('/preferences', verifyToken, async (req, res) => {
  const allowed = ['emailNotifications', 'priceAlerts', 'twoFactor'];
  const prefs = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) prefs[k] = !!req.body[k]; });

  try {
    // preferences column may not exist — add it if missing
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT NULL`).catch(() => {});
    await db.query('UPDATE users SET preferences=$1 WHERE id=$2', [prefs, req.userId]);
    res.json({ success: true });
  } catch (err) {
    // Non-fatal — preferences are local state anyway
    console.warn('[users] PUT preferences:', err.message);
    res.json({ success: true });
  }
});

// In-memory OTP store: { userId: { code, email, expiresAt, createdAt } }
// Resets on server restart — sufficient for dev/small deployments.
const otpStore = new Map();

// ── POST /api/users/send-verification-code ────────────────────────────────────
// Generates a 6-digit OTP, stores it in memory, makes it visible in admin panel.
router.post('/send-verification-code', verifyToken, async (req, res) => {
  const userId = req.userId;
  try {
    const { rows } = await db.query('SELECT email, name FROM users WHERE id=$1', [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(userId, { code, email: rows[0].email, name: rows[0].name, expiresAt, createdAt: new Date().toISOString() });

    console.log(`[verify] OTP for user ${userId} (${rows[0].email}): ${code}`);
    res.json({ success: true, message: 'Verification code generated. Check admin panel.' });
  } catch (err) {
    console.error('[users] send-verification-code:', err.message);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// ── POST /api/users/verify-email ─────────────────────────────────────────────
router.post('/verify-email', verifyToken, async (req, res) => {
  const userId = req.userId;
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  const stored = otpStore.get(userId);
  if (!stored) return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(userId);
    return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
  }
  if (String(code).trim() !== stored.code) {
    return res.status(400).json({ error: 'Incorrect verification code.' });
  }

  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`).catch(() => {});
    await db.query('UPDATE users SET email_verified=TRUE WHERE id=$1', [userId]);
    otpStore.delete(userId);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('[users] verify-email:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── GET /api/users/pending-verifications (admin only) ────────────────────────
const { checkAdminKey } = (() => {
  const checkAdminKey = (req, res, next) => {
    const key = req.headers['x-admin-key'];
    const expected = process.env.ADMIN_KEY || process.env.ADMIN_API_KEY;
    if (!key || !expected || key !== expected) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
  return { checkAdminKey };
})();

router.get('/pending-verifications', checkAdminKey, (req, res) => {
  const list = [];
  const now = Date.now();
  otpStore.forEach((val, userId) => {
    list.push({
      userId,
      email: val.email,
      name: val.name || '',
      code: val.code,
      createdAt: val.createdAt,
      expiresIn: Math.max(0, Math.round((val.expiresAt - now) / 1000)),
    });
  });
  // newest first
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

module.exports = router;
