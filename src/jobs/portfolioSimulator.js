const db = require('../db');

/**
 * Portfolio Simulator: Hourly balance reallocation across crypto coins
 * 
 * Rules:
 * - Runs ONLY Monday-Friday, every hour
 * - Divides user balance across 6 coins: BTC, ETH, USDT, USDC, XRP, ADA
 * - Uses inverse-price weighting (cheaper coins get more units)
 * - Applies 0.5%-2.5% balance boost
 * - Updates portfolio table atomically
 */

// Coin configuration
const ALL_COINS = ['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'];
const COIN_COLUMNS = {
  'BTC': 'btc_balance',
  'ETH': 'eth_balance',
  'USDT': 'usdt_balance',
  'USDC': 'usdc_balance',
  'XRP': 'xrp_balance',
  'ADA': 'ada_balance',
};

const CONFIG = {
  INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  BALANCE_BOOST_MIN: 0.005, // 0.5%
  BALANCE_BOOST_MAX: 0.025, // 2.5%
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
 * Fetch live prices from internal API
 */
async function getLivePrices() {
  try {
    // Prices are stored in memory/data from the priceUpdater job
    // For now, return mock prices based on coin names
    const prices = {};
    ALL_COINS.forEach(coin => {
      // Mock prices - in production, fetch from /api/prices or external API
      const basePrices = {
        'BTC': 45000 + (Math.random() * 10000),
        'ETH': 2500 + (Math.random() * 500),
        'USDT': 1.0,
        'USDC': 1.0,
        'XRP': 2.5 + (Math.random() * 0.5),
        'ADA': 0.8 + (Math.random() * 0.2),
      };
      prices[coin] = basePrices[coin];
    });
    return prices;
  } catch (err) {
    console.error('[Portfolio] Error fetching prices:', err.message);
    // Return default prices on error
    return {
      'BTC': 45000, 'ETH': 2500, 'USDT': 1.0, 'USDC': 1.0, 'XRP': 2.5, 'ADA': 0.8
    };
  }
}

/**
 * Randomly select coins for allocation
 * Returns: all 6 coins (4 top tier + 2 stable)
 */
function selectCoinsForAllocation() {
  // Always use all available coins for simplicity
  return ALL_COINS;
}

/**
 * Allocate balance across coins
 */
async function allocateBalance(userId, balance) {
  try {
    // Get live prices
    const prices = await getLivePrices();
    
    // Select coins
    const selectedCoins = selectCoinsForAllocation();
    
    // Calculate allocation: distribute balance based on inverse of price (cheaper coins get more allocation)
    const allocations = {};
    let totalWeightedValue = 0;
    
    selectedCoins.forEach(coin => {
      // Weight inversely proportional to price (cheaper coins get more units)
      const weight = 1 / prices[coin];
      allocations[coin] = weight;
      totalWeightedValue += weight;
    });
    
    // Normalize weights and calculate amounts
    const allocation = {};
    selectedCoins.forEach(coin => {
      const weight = allocations[coin] / totalWeightedValue;
      const amountInUSD = balance * weight;
      const amountInCoin = amountInUSD / prices[coin];
      allocation[coin] = {
        amount: amountInCoin,
        valueUSD: amountInUSD,
        price: prices[coin],
      };
    });
    
    // Add balance boost
    const boostPercent = CONFIG.BALANCE_BOOST_MIN + (Math.random() * (CONFIG.BALANCE_BOOST_MAX - CONFIG.BALANCE_BOOST_MIN));
    const boostedBalance = balance * (1 + boostPercent);
    
    return {
      allocation,
      boostPercent,
      newBalance: boostedBalance,
      prices,
    };
  } catch (err) {
    console.error(`[Portfolio] Error allocating balance for user ${userId}:`, err.message);
    return null;
  }
}

/**
 * Update user's portfolio with new allocation
 */
async function updatePortfolio(userId, allocation, newBalance) {
  let client;
  
  try {
    client = await db.getClient();
    await client.query('BEGIN');
    
    // Lock user and portfolio rows and read current balance
    const userRes = await client.query('SELECT id, COALESCE(balance,0) as balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    await client.query('SELECT id FROM portfolio WHERE user_id = $1 FOR UPDATE', [userId]);
    const oldBalance = userRes.rows.length ? parseFloat(userRes.rows[0].balance) : 0;

    // Update user balance
    await client.query(
      'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, userId]
    );

    // If balance decreased, record trading loss if applicable
    try { await recordLossIfApplicable(client, userId, oldBalance, newBalance); } catch (e) { console.warn('[portfolio] failed to record loss', e && e.message ? e.message : e); }
    
    // Update portfolio with new coin amounts
    const setClauses = [];
    const params = [userId];
    let paramIndex = 2;
    
    ALL_COINS.forEach(coin => {
      const col = COIN_COLUMNS[coin];
      const amount = allocation[coin]?.amount || 0;
      setClauses.push(`${col} = $${paramIndex}`);
      params.push(amount);
      paramIndex++;
    });
    
    params.push(new Date()); // updated_at
    setClauses.push(`updated_at = $${paramIndex}`);
    
    const updateQuery = `
      UPDATE portfolio 
      SET ${setClauses.join(', ')} 
      WHERE user_id = $1
    `;
    
    await client.query(updateQuery, params);
    
    // Create trade records for each coin allocation
    for (const coin of ALL_COINS) {
      const { amount, valueUSD, price } = allocation[coin];
      await client.query(
        `INSERT INTO trades (user_id, type, asset, amount, price, total, balance_before, balance_after, is_simulated, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)`,
        [userId, 'allocate', coin, amount, price, valueUSD, 0, newBalance, 'completed']
      );
    }
    
    await client.query('COMMIT');

    // Notify client via SSE
    try { sse.emit(userId, 'profile_update', { userId, balance: newBalance, type: 'portfolio' }); } catch (e) { /* ignore */ }
    
    console.log(
      `[Portfolio] User ${userId}: Updated portfolio | Balance: $${newBalance.toFixed(2)} | Allocated across ${ALL_COINS.length} coins`
    );
    
    return true;
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error(`[Portfolio] Error updating portfolio for user ${userId}:`, err.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * Ensure portfolio exists for user
 */
async function ensurePortfolioExists(userId) {
  try {
    await db.query(
      `INSERT INTO portfolio (user_id, btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance)
       VALUES ($1, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  } catch (err) {
    console.error(`[Portfolio] Error ensuring portfolio exists for user ${userId}:`, err.message);
  }
}

/**
 * Process all users
 */
async function runPortfolioSimulation() {
  const timestamp = new Date().toISOString();
  console.log(`[Portfolio Simulation] Starting at ${timestamp}`);
  
  try {
    const usersRes = await db.query(
      'SELECT id, balance FROM users WHERE balance > 0 ORDER BY id'
    );
    
    if (!usersRes.rows.length) {
      console.log('[Portfolio Simulation] No users with balance');
      return;
    }
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const user of usersRes.rows) {
      await ensurePortfolioExists(user.id);
      
      const result = await allocateBalance(user.id, user.balance);
      if (result) {
        const updated = await updatePortfolio(user.id, result.allocation, result.newBalance);
        if (updated) {
          successCount++;
        } else {
          failureCount++;
        }
      }
    }
    
    console.log(
      `[Portfolio Simulation] Completed: ${successCount} successful, ${failureCount} failed out of ${usersRes.rows.length} users`
    );
  } catch (err) {
    console.error('[Portfolio Simulation] Error:', err.message);
  }
}

/**
 * Start the simulator
 */
async function startPortfolioSimulator() {
  const timezone = process.env.TRADING_TIMEZONE || 'UTC';
  console.log(`[Portfolio Simulator] Starting hourly portfolio simulator (timezone: ${timezone})...`);
  
  await runPortfolioSimulation();
  
  const intervalId = setInterval(async () => {
    try {
      if (isTradingDay()) {
        await runPortfolioSimulation();
      } else {
        const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = dayOfWeek[new Date().getDay()];
        console.log(`[Portfolio Simulator] ${day} - Market closed, skipping`);
      }
    } catch (err) {
      console.error('[Portfolio Simulator] Error:', err.message);
    }
  }, CONFIG.INTERVAL_MS);
  
  process.on('SIGTERM', () => {
    console.log('[Portfolio Simulator] SIGTERM received, clearing interval...');
    clearInterval(intervalId);
  });
  
  console.log('[Portfolio Simulator] Initialized successfully');
}

module.exports = {
  startPortfolioSimulator,
  runPortfolioSimulation,
};
