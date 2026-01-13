const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/portfolio/allocate - Force immediate portfolio allocation for user
 */
router.post('/allocate', verifyToken, async (req, res) => {
  const userId = req.userId;
  
  try {
    // Get user balance
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const balance = parseFloat(userRes.rows[0].balance) || 0;
    if (balance <= 0) {
      return res.status(400).json({ error: 'Balance must be greater than 0' });
    }
    
    // Ensure portfolio exists
    await db.query(
      `INSERT INTO portfolio (user_id, btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance)
       VALUES ($1, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    
    // Allocate balance across coins
    const prices = {
      'BTC': 45000, 'ETH': 2500, 'USDT': 1.0, 'USDC': 1.0, 'XRP': 2.5, 'ADA': 0.8
    };
    
    const coins = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
    const weights = coins.map(c => 1 / prices[c]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    // Update portfolio atomically
    let client;
    try {
      client = await db.getClient();
      await client.query('BEGIN');
      
      const setClauses = [];
      const params = [userId];
      let idx = 2;
      
      coins.forEach((coin, i) => {
        const weight = weights[i] / totalWeight;
        const amountUSD = balance * weight;
        const amount = amountUSD / prices[coin];
        const col = {BTC:'btc_balance', ETH:'eth_balance', USDT:'usdt_balance', USDC:'usdc_balance', XRP:'xrp_balance', ADA:'ada_balance'}[coin];
        setClauses.push(`${col} = $${idx}`);
        params.push(amount);
        idx++;
      });
      
      params.push(new Date());
      setClauses.push(`updated_at = $${idx}`);
      
      await client.query(`UPDATE portfolio SET ${setClauses.join(', ')} WHERE user_id = $1`, params);
      await client.query('COMMIT');
    } finally {
      if (client) client.release();
    }
    
    console.log(`[Portfolio] Allocated balance for user ${userId}: $${balance}`);
    res.json({ success: true, allocated: true });
  } catch (err) {
    console.error('[Portfolio Allocate] Error:', err.message);
    res.status(500).json({ error: 'Failed to allocate portfolio' });
  }
});

module.exports = router;
