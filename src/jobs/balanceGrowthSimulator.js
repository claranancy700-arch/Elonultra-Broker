/**
 * Balance Growth Simulator
 * 
 * Generates hourly trades and boosts user portfolio/balance up to 2.5% per hour
 * - Runs Monday-Friday only
 * - Reads CURRENT balance atomically each hour
 * - Generates simulated trade with 2.5% trade size
 * - Updates balance atomically
 * - Logs all trades for audit trail
 * 
 * 24-hour lap span: Day1 balance 100 → boost 2.5%/hr for 24h → Day2 starts with new boosted balance
 */

const db = require('../db');
const schedule = require('node-schedule');
const { recordLossIfApplicable } = require('../services/balanceChanges');
const sse = require('../sse/broadcaster');

const CONFIG = {
  INTERVAL_CRON: '0 * * * *', // Every hour at minute 0
  BOOST_PERCENTAGE: 2.5, // 2.5% per hour
  ENABLED: process.env.BALANCE_GROWTH_ENABLED !== 'false',
  DEBUG: process.env.DEBUG_SIMULATOR === 'true',
};

// Helper: Check if today is a trading day (Monday-Friday)
function isTradingDay() {
  const day = new Date().getDay();
  return day >= 1 && day <= 5; // 1=Mon, 5=Fri
}

// Helper: Generate random boost between 0.5% and 2.5%
function getRandomBoost() {
  return (Math.random() * (CONFIG.BOOST_PERCENTAGE - 0.5) + 0.5).toFixed(4);
}

// Helper: Get current UTC hour (for 24-hour span tracking)
function getCurrentHour() {
  return new Date().getUTCHours();
}

/**
 * Main simulator: Process all active users
 * Atomic transaction ensures:
 * - Balance is read fresh
 * - Trade is created
 * - Balance is updated
 * - All in one transaction (prevents race conditions)
 */
async function processBalanceGrowth() {
  if (!CONFIG.ENABLED) return;

  // Check if trading day
  if (!isTradingDay()) {
    if (CONFIG.DEBUG) console.log('[BalanceGrowth] Not a trading day, skipping');
    return;
  }

  try {
    // Check if database is available
    if (!db || !db.query) {
      console.warn('[BalanceGrowth] Database not ready, skipping this run');
      return;
    }

    if (CONFIG.DEBUG) console.log('[BalanceGrowth] Starting hourly processing...');

    // Fetch all active users with simulators enabled
    const { rows: users } = await db.query(
      'SELECT id, balance FROM users WHERE sim_enabled = true AND is_active = true'
    );

    if (!users.length) {
      if (CONFIG.DEBUG) console.log('[BalanceGrowth] No active users to process');
      return;
    }

    if (CONFIG.DEBUG) console.log(`[BalanceGrowth] Processing ${users.length} users`);

    // Process each user atomically
    for (const user of users) {
      await processUserBalance(user.id, user.balance);
    }

    console.log(`[BalanceGrowth] Completed: ${users.length} users processed`);
  } catch (err) {
    console.error('[BalanceGrowth] Error in main loop:', err.message);
  }
}

/**
 * Process single user balance atomically
 * Uses transaction to prevent race conditions
 */
async function processUserBalance(userId, currentBalance) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. READ: Get fresh current balance (locked for update)
    const balanceRes = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (!balanceRes.rows.length) {
      await client.query('ROLLBACK');
      return;
    }

    const freshBalance = parseFloat(balanceRes.rows[0].balance);

    // 2. CALCULATE: Trade size is 2.5% of current balance
    const tradeSize = (freshBalance * (CONFIG.BOOST_PERCENTAGE / 100)).toFixed(8);
    const boostAmount = parseFloat(tradeSize);
    const randomBoost = parseFloat(getRandomBoost());

    // 3. GENERATE: Simulated trade
    const tradeType = Math.random() > 0.5 ? 'buy' : 'sell';
    const asset = getRandomAsset();
    const tradePrice = await getAssetPrice(asset);
    const tradeAmount = (boostAmount / tradePrice).toFixed(8);
    const tradeTotal = (tradeAmount * tradePrice).toFixed(8);

    // 4. UPDATE: Balance after boost (2.5% of current balance, randomly between 0.5-2.5%)
    const newBalance = (freshBalance + (freshBalance * (randomBoost / 100))).toFixed(8);

    // Create trade record
    await client.query(
      `INSERT INTO trades (user_id, type, asset, amount, price, total, balance_before, balance_after, is_simulated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [userId, tradeType, asset, tradeAmount, tradePrice, tradeTotal, freshBalance, newBalance]
    );

    // Update user balance and portfolio_value (keep them in sync)
    await client.query(
      'UPDATE users SET balance = $1, portfolio_value = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, userId]
    );

    // Log transaction for audit trail
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, currency, status, reference)
       VALUES ($1, 'trade', $2, 'USD', 'completed', $3)`,
      [userId, newBalance - freshBalance, `simulator: ${asset} ${tradeType} ${randomBoost.toFixed(2)}%`]
    );

    // If balance decreased, record trading loss if applicable
    try { await recordLossIfApplicable(client, userId, freshBalance, newBalance); } catch (e) { console.warn('[balanceGrowth] failed to record loss', e && e.message ? e.message : e); }

    // Update portfolio balance atomically
    await updatePortfolioBalance(client, userId, newBalance, asset);

    // Commit transaction
    await client.query('COMMIT');

    // Notify client via SSE
    try { sse.emit(userId, 'profile_update', { userId, balance: newBalance, type: 'simulator' }); } catch(e){/*ignore*/}

    if (CONFIG.DEBUG) {
      console.log(`[BalanceGrowth] User ${userId}: $${freshBalance} → $${newBalance} (+${randomBoost.toFixed(2)}%)`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[BalanceGrowth] Error processing user ${userId}:`, err.message);
  } finally {
    client.release();
  }
}

/**
 * Update portfolio balance for specific asset
 * Adds the boost amount to the asset balance
 */
async function updatePortfolioBalance(client, userId, newBalance, asset) {
  const assetColumn = `${asset.toLowerCase()}_balance`;

  // Get portfolio for this user
  const portfolioRes = await client.query(
    'SELECT * FROM portfolio WHERE user_id = $1',
    [userId]
  );

  if (!portfolioRes.rows.length) {
    // Create initial portfolio if doesn't exist
    await client.query(
      `INSERT INTO portfolio (user_id, ${assetColumn})
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, '1']
    );
  } else {
    // Update asset balance (proportional to user balance boost)
    const portfolio = portfolioRes.rows[0];
    const currentAssetBalance = parseFloat(portfolio[assetColumn] || 0);
    const boostRatio = newBalance / parseFloat(portfolio.usd_value || 1);
    const newAssetBalance = (currentAssetBalance * boostRatio).toFixed(8);

    await client.query(
      `UPDATE portfolio 
       SET ${assetColumn} = $1, usd_value = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [newAssetBalance, newBalance, userId]
    );
  }
}

/**
 * Get random cryptocurrency asset
 */
function getRandomAsset() {
  const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
  return assets[Math.floor(Math.random() * assets.length)];
}

/**
 * Get asset price from cache or estimate
 */
async function getAssetPrice(asset) {
  try {
    // Try to get price from prices table
    const { rows } = await db.query(
      'SELECT usd FROM prices WHERE symbol = $1 ORDER BY created_at DESC LIMIT 1',
      [asset]
    );

    if (rows.length) {
      return parseFloat(rows[0].usd);
    }
  } catch (err) {
    // Prices table might not exist, use fallback
  }

  // Fallback prices
  const fallbackPrices = {
    BTC: 43000,
    ETH: 2200,
    USDT: 1,
    USDC: 1,
    XRP: 2.5,
    ADA: 0.98,
  };

  return fallbackPrices[asset] || 1000;
}

/**
 * Initialize scheduler
 * Uses node-schedule to run hourly on all trading days
 */
function initializeScheduler() {
  if (!CONFIG.ENABLED) {
    console.log('[BalanceGrowth] Disabled via BALANCE_GROWTH_ENABLED');
    return;
  }

  try {
    // Schedule job every hour at minute 0
    const job = schedule.scheduleJob(CONFIG.INTERVAL_CRON, async () => {
      console.log('[BalanceGrowth] Scheduler triggered');
      await processBalanceGrowth();
    });

    console.log('[BalanceGrowth] Scheduler initialized (hourly, Mon-Fri)');

    return job;
  } catch (err) {
    console.error('[BalanceGrowth] Failed to initialize scheduler:', err);
  }
}

/**
 * Manual trigger (for testing/admin)
 */
async function manualRun(userId = null) {
  console.log('[BalanceGrowth] Manual run triggered');

  if (userId) {
    const { rows } = await db.query('SELECT id, balance FROM users WHERE id = $1', [userId]);
    if (rows.length) {
      await processUserBalance(rows[0].id, rows[0].balance);
      console.log(`[BalanceGrowth] Manual run completed for user ${userId}`);
    }
  } else {
    await processBalanceGrowth();
    console.log('[BalanceGrowth] Manual run completed for all users');
  }
}

module.exports = {
  initializeScheduler,
  manualRun,
  processBalanceGrowth,
};
