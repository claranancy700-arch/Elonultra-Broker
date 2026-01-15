const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // Timeout after 5 seconds
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});
/**
 * ensureSchema
 * Idempotently creates core tables and required columns, including withdrawal fee fields
 * and simulator fields on users.
 */
async function ensureSchema() {
  // Users table with balance + simulator scheduling fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      sim_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      sim_paused  BOOLEAN NOT NULL DEFAULT FALSE,
      sim_next_run_at TIMESTAMPTZ,
      sim_last_run_at TIMESTAMPTZ,
      sim_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(18,2) NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_paused BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_next_run_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_last_run_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_started_at TIMESTAMPTZ;`);

  // Contacts (legacy support)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Withdrawals with fee fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(18,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USDT',
      status TEXT NOT NULL DEFAULT 'pending',
      crypto_type TEXT,
      crypto_address TEXT,
      txn_hash TEXT,
      error_message TEXT,
      balance_snapshot NUMERIC(18,2),
      fee_amount NUMERIC(18,2),
      fee_currency TEXT NOT NULL DEFAULT 'USDT',
      fee_status TEXT NOT NULL DEFAULT 'required',
      fee_confirmed_at TIMESTAMPTZ,
      fee_confirmed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS balance_snapshot NUMERIC(18,2);`);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(18,2);`);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_currency TEXT NOT NULL DEFAULT 'USDT';`);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_status TEXT NOT NULL DEFAULT 'required';`);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_confirmed_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_confirmed_by TEXT;`);
  await pool.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
  ensureSchema,
};
