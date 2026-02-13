#!/usr/bin/env node
/* One-time migration: Ensure users.portfolio_value always equals users.balance
   - This sync ensures the business rule: available balance = portfolio value = total assets
   - Run: node scripts/sync_portfolio_value.js
*/
const db = require('../src/db');

(async function main(){
  const name = 'sync_portfolio_value_20260212';
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

    console.log('Syncing users.portfolio_value to users.balance...');
    const result = await db.query('UPDATE users SET portfolio_value = balance WHERE portfolio_value IS NULL OR portfolio_value != balance RETURNING id, balance, portfolio_value');
    
    if (result.rows.length) {
      console.log(`Updated ${result.rows.length} user(s):`);
      result.rows.forEach(r => {
        console.log(`  User ${r.id}: balance = portfolio_value = ${r.balance}`);
      });
    } else {
      console.log('All users already have portfolio_value synced with balance.');
    }

    await db.query('INSERT INTO applied_migrations(name) VALUES($1)', [name]);
    console.log('Migration applied successfully:', name);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
