const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,  // Timeout after 5 seconds
});

// Log connection errors
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
