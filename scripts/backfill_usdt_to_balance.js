#!/usr/bin/env node
/* One-time migration: backfill USD/USDT completed transactions into users.balance
   - Creates a simple applied_migrations table to avoid re-running
   - Sums completed transactions where currency IN ('USD','USDT') and adds to users.balance and portfolio_value
   - Run: node scripts/backfill_usdt_to_balance.js
*/
const db = require('../src/db');

(async function main(){
  const name = 'backfill_usdt_to_balance_20260212';
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS applied_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )`);

    const exists = await db.query('SELECT name FROM applied_migrations WHERE name=$1', [name]);
    if (exists.rows.length) {
      console.log('Migration already applied:', name);
      process.exit(0);
    }

    console.log('Computing USD/USDT totals from completed transactions...');
    const totals = await db.query("SELECT user_id, SUM(amount)::numeric(20,8) AS total_usd FROM transactions WHERE status='completed' AND UPPER(currency) IN ('USD','USDT') GROUP BY user_id");

    if (!totals.rows.length) {
      console.log('No USD/USDT completed transactions found. Nothing to do.');
      await db.query('INSERT INTO applied_migrations(name) VALUES($1)', [name]);
      process.exit(0);
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of totals.rows) {
        const userId = r.user_id;
        const amt = r.total_usd ? Number(r.total_usd) : 0;
        if (!amt || amt === 0) continue;

        console.log(`Crediting user ${userId} with ${amt} (from completed USD/USDT transactions)`);
        await client.query('UPDATE users SET balance = COALESCE(balance,0) + $1, portfolio_value = COALESCE(portfolio_value,0) + $1, updated_at = NOW() WHERE id=$2', [amt, userId]);
      }
      await client.query('INSERT INTO applied_migrations(name) VALUES($1)', [name]);
      await client.query('COMMIT');
      console.log('Migration applied successfully:', name);
    } catch (err) {
      await client.query('ROLLBACK').catch(()=>{});
      throw err;
    } finally {
      client.release();
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
