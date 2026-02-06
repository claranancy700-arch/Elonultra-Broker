const db = require('../db');

// Fixed allocation weights (must sum to 1.0)
const WEIGHTS = {
  BTC: 0.30,
  ETH: 0.25,
  USDT: 0.15,
  USDC: 0.10,
  XRP: 0.10,
  ADA: 0.10,
};

// Mock prices used to convert USD allocations into coin units.
// (The separate priceUpdater job can still compute portfolio_value later using live prices.)
const PRICES = {
  BTC: 45000,
  ETH: 2500,
  USDT: 1,
  USDC: 1,
  XRP: 2.5,
  ADA: 0.8,
};

function computeAllocation(balanceUsd) {
  const bal = Number(balanceUsd) || 0;
  const out = {};
  for (const sym of Object.keys(WEIGHTS)) {
    const weight = WEIGHTS[sym];
    const price = PRICES[sym] || 1;
    const usd = bal * weight;
    out[sym] = {
      usd,
      price,
      amount: usd / price,
    };
  }
  return out;
}

async function ensurePortfolioRow(client, userId) {
  await client.query(
    `INSERT INTO portfolio (user_id, btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance, usd_value)
     VALUES ($1, 0, 0, 0, 0, 0, 0, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function allocatePortfolioForUser(userId, balanceUsd, { client = null } = {}) {
  const allocation = computeAllocation(balanceUsd);

  const ownedClient = !client;
  const c = client || (await db.getClient());

  try {
    if (ownedClient) await c.query('BEGIN');

    await ensurePortfolioRow(c, userId);

    const btc = allocation.BTC.amount;
    const eth = allocation.ETH.amount;
    const usdt = allocation.USDT.amount;
    const usdc = allocation.USDC.amount;
    const xrp = allocation.XRP.amount;
    const ada = allocation.ADA.amount;

    // Update coin balances and best-effort USD valuation (using the same mock prices)
    const usdValue =
      btc * PRICES.BTC +
      eth * PRICES.ETH +
      usdt * PRICES.USDT +
      usdc * PRICES.USDC +
      xrp * PRICES.XRP +
      ada * PRICES.ADA;

    await c.query(
      `UPDATE portfolio
       SET btc_balance=$2, eth_balance=$3, usdt_balance=$4, usdc_balance=$5, xrp_balance=$6, ada_balance=$7,
           usd_value=$8, updated_at=NOW()
       WHERE user_id=$1`,
      [userId, btc, eth, usdt, usdc, xrp, ada, usdValue]
    );

    // CRITICAL: Keep balance = portfolio value so they always match
    // Total Portfolio Value = Total Asset Holdings = User Balance
    await c.query('UPDATE users SET balance=$1, portfolio_value=$1, updated_at=NOW() WHERE id=$2', [usdValue, userId]);

    if (ownedClient) await c.query('COMMIT');
    return { allocation, usd_value: usdValue };
  } catch (err) {
    if (ownedClient) await c.query('ROLLBACK');
    throw err;
  } finally {
    if (ownedClient) c.release();
  }
}

module.exports = {
  allocatePortfolioForUser,
  computeAllocation,
  PRICES,
  WEIGHTS,
};
