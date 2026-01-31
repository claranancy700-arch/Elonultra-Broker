const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local first (for local development), then .env
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config();

let pool;
let usingSQLite = false;
let sqliteDb = null;

async function initializeDatabase() {
  try {
    // Try PostgreSQL first
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });

    // Test the connection with a simple query
    await pool.query('SELECT 1');
    console.log('Using PostgreSQL database');
  } catch (err) {
    console.log('PostgreSQL connection failed, falling back to SQLite:', err.message);
    usingSQLite = true;
    
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, '../../elon_test.db');
    
    sqliteDb = new sqlite3.Database(dbPath);
    
    // Initialize SQLite tables
    await new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        sqliteDb.run('PRAGMA foreign_keys = ON');
        
        // Create tables compatible with PostgreSQL schema
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          balance REAL DEFAULT 0,
          portfolio_value REAL DEFAULT 0,
          fullName TEXT,
          phone TEXT,
          tax_id TEXT,
          is_active INTEGER DEFAULT 1,
          deleted_at TEXT,
          sim_enabled INTEGER DEFAULT 0,
          sim_paused INTEGER DEFAULT 0,
          sim_next_run_at TEXT,
          sim_last_run_at TEXT,
          sim_started_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'USD',
          status TEXT DEFAULT 'completed',
          reference TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS testimonies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_name TEXT NOT NULL,
          client_image TEXT,
          title TEXT,
          rating INTEGER,
          content TEXT NOT NULL,
          is_featured INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`, () => {
          console.log('SQLite database initialized');
          resolve();
        });
      });
    });
  }
}

// Initialize on module load
initializeDatabase().catch(err => console.error('Database initialization error:', err));

function sqliteQuery(text, params = []) {
  return new Promise((resolve, reject) => {
    if (text.trim().toUpperCase().startsWith('SELECT')) {
      sqliteDb.all(text, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
      });
    } else {
      sqliteDb.run(text, params, function(err) {
        if (err) reject(err);
        else resolve({ rowCount: this.changes, rows: [] });
      });
    }
  });
}

async function query(text, params) {
  if (usingSQLite) {
    return sqliteQuery(text, params);
  } else {
    return pool.query(text, params);
  }
}

async function getClient() {
  if (usingSQLite) {
    return sqliteDb;
  } else {
    return pool.connect();
  }
}

// Log connection errors for PostgreSQL
if (!usingSQLite) {
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
