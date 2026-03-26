const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local first (for local development), then .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

let pool;
let sqliteDb;

async function initializeDatabase() {
  try {
    // Try PostgreSQL first
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        max: 20,
      });

      // Test the connection
      await pool.query('SELECT 1');
      console.log('✓ Using PostgreSQL database');
      return;
    }
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection failed:', err.message);
  }

  // Fall back to SQLite
  try {
    const dbPath = path.join(__dirname, '../../elon_dev.db');
    sqliteDb = new sqlite3.Database(dbPath);
    console.log('✓ Using SQLite database at:', dbPath);

    // Enable foreign keys
    sqliteDb.run('PRAGMA foreign_keys = ON');

    // Create basic tables
    await runSQLiteQuery(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      balance REAL DEFAULT 0,
      portfolio_value REAL DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Chat tables
    await runSQLiteQuery(`CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      admin_id INTEGER,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'waiting')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await runSQLiteQuery(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Indexes
    await runSQLiteQuery(`CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id)`);
    await runSQLiteQuery(`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id)`);

    console.log('✓ SQLite tables initialized');
  } catch (err) {
    console.error('SQLite initialization failed:', err);
  }
}

// Helper for SQLite queries
function runSQLiteQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getSQLiteQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allSQLiteQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve({ rows });
    });
  });
}

// Initialize on module load
initializeDatabase().catch(err => console.error('Database initialization error:', err));

async function query(text, params) {
  if (pool) {
    return pool.query(text, params);
  } else if (sqliteDb) {
    // Convert PostgreSQL syntax to SQLite for basic queries
    if (text.includes('INSERT') || text.includes('UPDATE') || text.includes('DELETE')) {
      return runSQLiteQuery(text, params);
    } else {
      return allSQLiteQuery(text, params);
    }
  } else {
    throw new Error('Database connection not available');
  }
}

async function getClient() {
  if (pool) {
    return pool.connect();
  } else if (sqliteDb) {
    // For SQLite, return an object that mimics pg client
    return {
      query: (text, params) => {
        if (text.includes('INSERT') || text.includes('UPDATE') || text.includes('DELETE')) {
          return runSQLiteQuery(text, params);
        } else {
          return allSQLiteQuery(text, params);
        }
      },
      release: () => {} // No-op for SQLite
    };
  } else {
    throw new Error('Database connection not available');
  }
}

module.exports = { query, getClient };

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
  // ensure the balance column exists and is wide enough; alter type for existing data
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(30,8) NOT NULL DEFAULT 0;`);
  try {
    await pool.query(`ALTER TABLE users ALTER COLUMN balance TYPE NUMERIC(30,8)`);
  } catch (e) {
    // older PG versions may not support USING or the table might already be wide enough
    debug('adjusting users.balance precision:', e.message);
  }

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
