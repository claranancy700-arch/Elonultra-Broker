const db = require('../db');
const { allocatePortfolioForUser } = require('../services/portfolioAllocator');

const CONFIG = {
  POLL_MS: 60 * 1000,
  RUN_INTERVAL_MS: 60 * 60 * 1000,
  GROWTH_RATE: 0.095, // 9.5% per hour
};

async function runForUser(userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const lock = await client.query(
      `SELECT id, COALESCE(balance,0) AS balance, sim_enabled, sim_paused, sim_next_run_at
       FROM users
       WHERE id=$1
       FOR UPDATE`,
      [userId]
    );

    if (!lock.rows.length) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'user_not_found' };
    }

    const row = lock.rows[0];
    const bal = Number(row.balance) || 0;
    const enabled = !!row.sim_enabled;
    const paused = !!row.sim_paused;

    if (!enabled || paused) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'disabled_or_paused' };
    }

    // Ensure still due (avoid race between poll and lock)
    if (!row.sim_next_run_at || new Date(row.sim_next_run_at).getTime() > Date.now()) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'not_due' };
    }

    if (bal <= 0) {
      await client.query('ROLLBACK');
      return { ok: false, reason: 'no_balance' };
    }

    const newBalance = bal * (1 + CONFIG.GROWTH_RATE);
    const profit = newBalance - bal;

    await client.query(
      `UPDATE users
       SET balance=$2, sim_last_run_at=NOW(), sim_next_run_at=(NOW() + INTERVAL '1 hour'), updated_at=NOW()
       WHERE id=$1`,
      [userId, newBalance]
    );

    // Record simulated trade entry
    await client.query(
      `INSERT INTO trades (user_id, type, asset, amount, price, total, balance_before, balance_after, status, is_simulated, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,NOW())`,
      [userId, 'simulated', 'PROFIT', profit, 1, profit, bal, newBalance, 'completed']
    );

    // Reallocate portfolio based on updated balance
    await allocatePortfolioForUser(userId, newBalance, { client });

    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    console.error('[UserTradeSimulator] user', userId, 'failed:', err.message || err);
    return { ok: false, reason: 'error', error: err.message || String(err) };
  } finally {
    client.release();
  }
}

async function tick() {
  try {
    const due = await db.query(
      `SELECT id
       FROM users
       WHERE sim_enabled = TRUE
         AND sim_paused = FALSE
         AND COALESCE(balance,0) > 0
         AND sim_next_run_at IS NOT NULL
         AND sim_next_run_at <= NOW()
       ORDER BY id
       LIMIT 200`
    );

    if (!due.rows.length) return;

    for (const u of due.rows) {
      await runForUser(u.id);
    }
  } catch (err) {
    console.error('[UserTradeSimulator] tick error:', err.message || err);
  }
}

function startUserTradeSimulator() {
  console.log('[UserTradeSimulator] Starting (poll ms):', CONFIG.POLL_MS);

  // initial tick shortly after boot
  setTimeout(() => tick(), 1500);

  const intervalId = setInterval(() => tick(), CONFIG.POLL_MS);

  process.on('SIGTERM', () => {
    clearInterval(intervalId);
  });
}

module.exports = {
  startUserTradeSimulator,
};
