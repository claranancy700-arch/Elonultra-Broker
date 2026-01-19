const db = require('./src/db');

async function checkDeposits() {
  try {
    const result = await db.query(
      "SELECT * FROM transactions WHERE type = 'deposit' ORDER BY created_at DESC LIMIT 10"
    );
    console.log('DEPOSIT TRANSACTIONS FOUND:', result.rows.length);
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
}

checkDeposits();
