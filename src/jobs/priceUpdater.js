const db = require('../db');

// Map symbol -> coingecko id
const CG_MAP = { BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin', XRP: 'ripple', ADA: 'cardano' };

async function fetchPrices(symbols) {
  try {
    const ids = symbols.map(s => CG_MAP[s]).filter(Boolean).join(',');
    if (!ids) return {};
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error('Price fetch failed: ' + res.status);
    const json = await res.json();
    const out = {};
    for (const sym of symbols) {
      const id = CG_MAP[sym];
      if (id && json[id] && json[id].usd) out[sym] = Number(json[id].usd);
    }
    return out;
  } catch (err) {
    console.error('fetchPrices error', err.message || err);
    return {};
  }
}

async function updatePortfolioValues() {
  try {
    // Check if database is available
    if (!db || !db.query) {
      console.warn('[Portfolio Updater] Database not ready, skipping this run');
      return;
    }

    // read portfolio rows
    const p = await db.query('SELECT user_id, btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance FROM portfolio');
    if (!p.rows || p.rows.length === 0) return;
    // determine symbols to fetch
    const symbols = ['BTC','ETH','USDT','USDC','XRP','ADA'];
    const prices = await fetchPrices(symbols);

    for (const row of p.rows) {
      const vals = {
        BTC: Number(row.btc_balance) || 0,
        ETH: Number(row.eth_balance) || 0,
        USDT: Number(row.usdt_balance) || 0,
        USDC: Number(row.usdc_balance) || 0,
        XRP: Number(row.xrp_balance) || 0,
        ADA: Number(row.ada_balance) || 0,
      };

      let total = 0;
      for (const s of Object.keys(vals)) {
        const amt = vals[s];
        const price = prices[s] || 0;
        total += amt * price;
      }

      // Update portfolio.usd_value and users.portfolio_value
      // CRITICAL: Keep balance = portfolio_value so they always match
      await db.query('UPDATE portfolio SET usd_value = $1, updated_at = NOW() WHERE user_id = $2', [total, row.user_id]);
      await db.query('UPDATE users SET balance = $1, portfolio_value = $1, updated_at = NOW() WHERE id = $2', [total, row.user_id]);
    }
    console.log('Portfolio valuation updated for', p.rows.length, 'users');
  } catch (err) {
    console.error('updatePortfolioValues error', err.message || err);
  }
}

function startPriceUpdater({ intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  // run immediately then on interval
  setImmediate(() => updatePortfolioValues());
  setInterval(() => updatePortfolioValues(), intervalMs);
  console.log('Price updater started (interval ms):', intervalMs);
}

module.exports = { startPriceUpdater, updatePortfolioValues };
