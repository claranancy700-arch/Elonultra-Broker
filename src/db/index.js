const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local first (for local development), then .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

let pool;

async function initializeDatabase() {
  try {
    // Try PostgreSQL first
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  DATABASE_URL not set. Database features will be unavailable.');
      return;
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 30000, // Increased from 5s to 30s for Render.com remote DB
      idleTimeoutMillis: 30000,
      max: 20, // Connection pool size
    });

    // Test the connection with a simple query
    await pool.query('SELECT 1');
    console.log('✓ Using PostgreSQL database');
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection failed:', err.message);
    console.warn('   (This is OK for local testing. Render will use its internal database URL)');
    console.warn('   Backend API calls will fail, but React frontend will still load.');
  }
}

// Initialize on module load
initializeDatabase().catch(err => console.error('Database initialization error:', err));

async function query(text, params) {
  if (!pool) {
    throw new Error('Database connection not available. Set DATABASE_URL in .env');
  }
  return pool.query(text, params);
}

async function getClient() {
  if (!pool) {
    throw new Error('Database connection not available. Set DATABASE_URL in .env');
  }
  return pool.connect();
}

// Log connection errors for PostgreSQL
if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });
}
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
      balance NUMERIC(20,8) NOT NULL DEFAULT 0,
      sim_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      sim_paused  BOOLEAN NOT NULL DEFAULT FALSE,
      sim_next_run_at TIMESTAMPTZ,
      sim_last_run_at TIMESTAMPTZ,
      sim_started_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(20,8) NOT NULL DEFAULT 0;`);
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

  // Admin config (for storing admin settings like deposit addresses)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id SERIAL PRIMARY KEY,
      config_key VARCHAR(255) UNIQUE NOT NULL,
      config_value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Deposit addresses (secure server-side storage)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deposit_addresses (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) UNIQUE NOT NULL,
      address TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Initialize default deposit addresses if not exists
  const defaultAddresses = {
    BTC: 'bc1qmockaddressforbtc00000000000000',
    ETH: '0xMockEthereumAddressForDeposit0000000000000000',
    USDT: 'TMockTetherAddressUSDT000000000000000',
    USDC: '0xMockUSDCCryptoAddress0000000000000000'
  };
  for (const [symbol, address] of Object.entries(defaultAddresses)) {
    await pool.query(
      `INSERT INTO deposit_addresses (symbol, address) VALUES ($1, $2) ON CONFLICT (symbol) DO NOTHING`,
      [symbol, address]
    );
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
  ensureSchema,
};
