const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

/**
 * Helper: Fetch live prices and 24h changes from CoinGecko with fallback
 */
async function fetchLivePricesAndChanges() {
  let pricesData = {
    prices: { 'BTC': 45000, 'ETH': 2500, 'USDT': 1.0, 'USDC': 1.0, 'XRP': 2.5, 'ADA': 0.8 },
    changes_24h: { 'BTC': 2.5, 'ETH': 1.8, 'USDT': 0.1, 'USDC': 0.05, 'XRP': -1.2, 'ADA': 0.3 }
  };
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,usd-coin,ripple,cardano&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false&include_24hr_change=true&include_last_updated_at=false';
    const res = await fetch(url, { timeout: 10000 });
    if (res.ok) {
      const data = await res.json();
      pricesData = {
        prices: {
          'BTC': data.bitcoin?.usd || 45000,
          'ETH': data.ethereum?.usd || 2500,
          'USDT': data.tether?.usd || 1.0,
          'USDC': data['usd-coin']?.usd || 1.0,
          'XRP': data.ripple?.usd || 2.5,
          'ADA': data.cardano?.usd || 0.8,
        },
        changes_24h: {
          'BTC': data.bitcoin?.usd_24h_change || 2.5,
          'ETH': data.ethereum?.usd_24h_change || 1.8,
          'USDT': data.tether?.usd_24h_change || 0.1,
          'USDC': data['usd-coin']?.usd_24h_change || 0.05,
          'XRP': data.ripple?.usd_24h_change || -1.2,
          'ADA': data.cardano?.usd_24h_change || 0.3,
        }
      };
    }
  } catch (err) {
    console.warn('[Portfolio] CoinGecko fetch failed, using fallback prices:', err.message);
  }
  return pricesData;
}

/**
 * GET /api/portfolio - User's portfolio with live prices
 * 
 * Response structure:
 * - balance: Available cash in USD (users.balance field)
 * - assets_value: Total value of all cryptocurrency holdings at current prices
 * - total_value: Full account value = balance + assets_value (what user should see as "Total")
 * - positions: Array of individual holdings with live prices
 * - change_24h: Weighted average 24h price change across holdings
 * 
 * Example: User with $1000 cash and $5000 in BTC:
 * {
 *   balance: 1000,           // Available cash
 *   assets_value: 5000,      // Holdings value
 *   total_value: 6000,       // Full account = cash + holdings
 *   positions: [{ coin, amount, price, value, change_24h }],
 *   change_24h: 2.5          // Weighted change
 * }
 */
router.get('/', verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    // Get user balance and portfolio
    const userRes = await db.query('SELECT balance, portfolio_value FROM users WHERE id = $1', [userId]);
    const portfolioRes = await db.query(
      'SELECT btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance FROM portfolio WHERE user_id = $1',
      [userId]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    let balance = parseFloat(userRes.rows[0].balance) || 0;
    const portfolio_value_db = parseFloat(userRes.rows[0].portfolio_value) || 0;
    const portfolio = portfolioRes.rows[0] || {};
    const { prices, changes_24h } = await fetchLivePricesAndChanges();

    console.log(`[Portfolio API] User ${userId}: balance=${balance}, portfolio_value=${portfolio_value_db}, portfolio exists=${!!portfolioRes.rows.length}`);

    // Build positions array with live prices
    const positions = [];
    let totalHoldingsValue = 0;
    let change24hWeightedSum = 0;

    const coins = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
    const columns = ['btc_balance', 'eth_balance', 'usdt_balance', 'usdc_balance', 'xrp_balance', 'ada_balance'];

    coins.forEach((coin, i) => {
      const amount = parseFloat(portfolio[columns[i]]) || 0;
      const price = prices[coin];
      const value = amount * price;

      if (amount > 0) {
        positions.push({
          coin,
          amount: parseFloat(amount.toFixed(8)),
          price: parseFloat(price.toFixed(2)),
          value: parseFloat(value.toFixed(2)),
          change_24h: changes_24h[coin] || 0,
        });
        totalHoldingsValue += value;
      }
    });

    // Calculate weighted 24h change
    if (totalHoldingsValue > 0) {
      positions.forEach(pos => {
        const weight = pos.value / totalHoldingsValue;
        change24hWeightedSum += pos.change_24h * weight;
      });
    }

    // Sort by value descending
    positions.sort((a, b) => b.value - a.value);

    // CRITICAL FIX: Ensure balance syncs with portfolio_value
    // These should ALWAYS be equal and represent total account value
    if (balance !== portfolio_value_db) {
      // Mismatch detected - use the non-zero value
      const correctBalance = Math.max(balance, portfolio_value_db);
      console.log(`[Portfolio SYNC] ⚠️  Mismatch detected for user ${userId}:`);
      console.log(`   balance=${balance}, portfolio_value=${portfolio_value_db}, using=${correctBalance}`);
      
      try {
        // Set both to the correct value
        await db.query(
          'UPDATE users SET balance = $1, portfolio_value = $1, updated_at = NOW() WHERE id = $2',
          [correctBalance, userId]
        );
        balance = correctBalance;
        console.log(`[Portfolio SYNC] ✓ Fixed user ${userId}: both now = $${correctBalance.toFixed(2)}`);
      } catch (err) {
        console.warn('[Portfolio SYNC] ⚠️  Could not persist fix:', err.message);
        // Still use corrected balance in response
        balance = correctBalance;
      }
    }

    // Calculate account value
    let totalAccountValue = balance + totalHoldingsValue;

    const response = {
      balance: parseFloat(balance.toFixed(2)),                     // User's Available Balance
      assets_value: parseFloat(totalHoldingsValue.toFixed(2)),     // Value of holdings
      total_value: parseFloat(totalAccountValue.toFixed(2)),       // Total account value = balance + holdings
      positions,
      change_24h: parseFloat(change24hWeightedSum.toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    console.log(`[Portfolio API] User ${userId}: balance=$${response.balance}, holdings=$${response.assets_value}, total=$${response.total_value}, 24h_change=${response.change_24h}%`);
    res.json(response);
  } catch (err) {
    console.error('[Portfolio API] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }

/**
 * POST /api/portfolio/allocate - Force immediate portfolio allocation
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
    
    console.log(`[Portfolio] Allocating balance for user ${userId}: $${balance}`);
    
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
      
      console.log(`[Portfolio] Successfully allocated balance for user ${userId}`);
    } finally {
      if (client) client.release();
    }
    
    res.json({ success: true, allocated: true });
  } catch (err) {
    console.error('[Portfolio Allocate] Error:', err.message);
    res.status(500).json({ error: 'Failed to allocate portfolio' });
  }
});

module.exports = router;
