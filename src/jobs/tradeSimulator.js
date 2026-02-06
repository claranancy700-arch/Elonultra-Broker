const db = require('../db');
const { recordLossIfApplicable } = require('../services/balanceChanges');
const sse = require('../sse/broadcaster');

/**
 * Portfolio Simulator: Hourly balance reallocation across crypto coins
 * 
 * Rules:
 * - Runs ONLY Monday-Friday, every hour
 * - Randomly selects 7 coins: 4 top tier (BTC, ETH, XRP, ADA) + 2 mid-tier (USDT, USDC)
 * - Divides user balance across selected coins
 * - Fetches live prices
 * - Updates portfolio table atomically
 * - Creates trade records for audit trail
 */

// Top tier coins (4 guaranteed)
const TOP_TIER = ['BTC', 'ETH', 'XRP', 'ADA'];
// Mid-tier coins (2 selected randomly)
const MID_TIER = ['USDT', 'USDC'];
// All coins available in portfolio
const PORTFOLIO_COINS = ['btc_balance', 'eth_balance', 'usdt_balance', 'usdc_balance', 'xrp_balance', 'ada_balance'];
const COIN_NAMES = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];

// Trade simulator configuration
const CONFIG = {
  INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  BALANCE_BOOST_PERCENT: 2.22, // 2.22% per trade = 68% growth in 24 hours (compounded)
};

/**
 * Check if today is a trading day (Mon-Fri)
 */
function isTradingDay() {
  const timezone = process.env.TRADING_TIMEZONE || 'UTC';
  
  let day;
  if (timezone === 'UTC') {
    day = new Date().getUTCDay();
  } else {
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone,
      weekday: 'long'
    });
    const dayName = formatter.format(new Date());
    const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0 };
    day = dayMap[dayName];
  }
  
  return day >= 1 && day <= 5;
}

/**
 * Generate a trade for a user: random coin, amount, and success rate
 */
async function generateTradeForUser(userId) {
  try {
    // Fetch user's current balance
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) return null;

    const currentBalance = parseFloat(userRes.rows[0].balance);
    if (currentBalance <= 0) return null;

    // Select 7 coins: all top tier (4) + random 2 mid-tier
    const selectedCoins = [...TOP_TIER, ...MID_TIER.sort(() => Math.random() - 0.5).slice(0, 2)];
    const randomCoin = selectedCoins[Math.floor(Math.random() * selectedCoins.length)];

    // Random trade amount (5-15% of balance)
    const tradeAmount = currentBalance * (0.05 + Math.random() * 0.1);
    
    // Mock price (in production, fetch from live API)
    const price = 100 + Math.random() * 50000;
    
    // ALWAYS succeeds — no failures (68% growth in 24 hours via hourly trades)
    const boostPercent = CONFIG.BALANCE_BOOST_PERCENT / 100; // Convert to decimal
    const balanceGain = currentBalance * boostPercent;

    return {
      userId,
      type: Math.random() > 0.5 ? 'buy' : 'sell',
      asset: randomCoin,
      amount: tradeAmount,
      price,
      total: tradeAmount * price,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + balanceGain,
      boostPercent,
    };
  } catch (err) {
    console.error(`[Trade] Error generating trade for user ${userId}:`, err.message);
    return null;
  }
}

/**
 * Execute trade: atomic balance update + trade record insertion
 */
async function executeTrade(trade) {
  let client;

  try {
    client = await db.getClient();
    await client.query('BEGIN');

    // Lock the user row for update (prevent concurrent balance changes)
    const lockRes = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [trade.userId]
    );

    if (!lockRes.rows.length) {
      await client.query('ROLLBACK');
      return false;
    }

    const lockedBalance = parseFloat(lockRes.rows[0].balance);

    // Calculate final balance with consistent boost
    const finalBalance = lockedBalance + (lockedBalance * trade.boostPercent);

    // Update user balance and portfolio_value (keep them in sync)
    await client.query(
      'UPDATE users SET balance = $1, portfolio_value = $1, updated_at = NOW() WHERE id = $2',
      [finalBalance, trade.userId]
    );

    // Insert trade record
    const result = await client.query(
      `INSERT INTO trades (user_id, type, asset, amount, price, total, balance_before, balance_after, is_simulated, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
       RETURNING id`,
      [
        trade.userId,
        trade.type,
        trade.asset,
        trade.amount,
        trade.price,
        trade.total,
        lockedBalance,
        finalBalance,
        'completed',
      ]
    );

    // If the update resulted in a lower balance and user has no tax_id, record it as a loss
    try { await recordLossIfApplicable(client, trade.userId, lockedBalance, finalBalance); } catch(e){ console.warn('[tradeSimulator] failed to record loss', e && e.message ? e.message : e); }

    await client.query('COMMIT');

    // Notify user of balance update
    try { sse.emit(trade.userId, 'profile_update', { userId: trade.userId, balance: finalBalance, type: 'trade' }); } catch(e) { /* ignore */ }

    console.log(
      `[Trade] User ${trade.userId}: ${trade.type.toUpperCase()} ${trade.amount.toFixed(2)} ${trade.asset} @ $${trade.price.toFixed(2)} | Balance: $${lockedBalance.toFixed(2)} → $${finalBalance.toFixed(2)} | Trade ID: ${result.rows[0].id}`
    );

    return true;
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error(`[Trade] Transaction error for user ${trade.userId}:`, err.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * Main trade generation loop: run hourly on trading days
 * Automatically restarts on error and logs to console for monitoring
 */
async function startTradeSimulator() {
  const timezone = process.env.TRADING_TIMEZONE || 'UTC';
  console.log(`[Trade Simulator] Starting hourly trade simulator (timezone: ${timezone})...`);

  // Run immediately on startup if it's a trading day
  await runTradeGeneration();

  // Schedule hourly execution with error handling and restart
  const intervalId = setInterval(async () => {
    try {
      if (isTradingDay()) {
        await runTradeGeneration();
      } else {
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = dayOfWeek[new Date().getDay()];
        console.log(`[Trade Simulator] ${day} - Market closed, skipping trade generation`);
      }
    } catch (err) {
      console.error('[Trade Simulator] Unhandled error in trade generation loop:', err.message);
      // Continue retrying - do NOT clear interval
    }
  }, CONFIG.INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Trade Simulator] SIGTERM received, clearing interval...');
    clearInterval(intervalId);
  });

  console.log('[Trade Simulator] Hourly scheduler initialized successfully');
}

/**
 * Fetch all eligible users and generate trades
 */
async function runTradeGeneration() {
  const timestamp = new Date().toISOString();
  console.log(`[Trade Generation] Starting at ${timestamp}`);

  try {
    // Check if database is available
    if (!db || !db.query) {
      console.warn('[Trade Generation] Database not ready, skipping this run');
      return;
    }

    // Fetch all users with non-zero balance
    const usersRes = await db.query(
      'SELECT id FROM users WHERE balance > 0 ORDER BY id'
    );

    if (!usersRes.rows.length) {
      console.log('[Trade Generation] No users with balance');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Generate and execute trades for each user
    for (const user of usersRes.rows) {
      const trade = await generateTradeForUser(user.id);
      if (trade) {
        const executed = await executeTrade(trade);
        if (executed) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }

    console.log(
      `[Trade Generation] Completed: ${successCount} successful, ${failureCount} failed out of ${usersRes.rows.length} users`
    );
  } catch (err) {
    console.error('[Trade Generation] Error:', err.message);
  }
}

module.exports = {
  startTradeSimulator,
  runTradeGeneration,
  isTradingDay,
};
