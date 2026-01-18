// SQLite fallback for when PostgreSQL is not available
// Used for local testing and development
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../elon_test.db');
let db;

function initDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else {
        console.log('SQLite database initialized at:', dbPath);
        db.serialize(() => {
          // Enable foreign keys
          db.run('PRAGMA foreign_keys = ON');
          
          // Create tables
          db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            balance REAL DEFAULT 0,
            portfolio_value REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`);
          
          db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            type TEXT CHECK(type IN ('deposit', 'withdrawal', 'trade', 'buy', 'sell')),
            amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            method TEXT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            txid TEXT
          )`);
          
          db.run(`CREATE TABLE IF NOT EXISTS testimonies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            message TEXT,
            approved BOOLEAN DEFAULT 0,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
          )`, () => {
            resolve();
          });
        });
      }
    });
  });
}

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ rows: [{ id: this.lastID }], rowCount: 1 });
      });
    }
  });
}

module.exports = {
  query,
  initDb,
  getClient: async () => db,
  pool: { on: () => {} }
};
