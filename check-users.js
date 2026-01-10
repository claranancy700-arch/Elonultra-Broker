const db = require('./src/db');

(async () => {
  try {
    const result = await db.query('SELECT id, email, balance FROM users ORDER BY id');
    console.log(`Total users: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`  ID: ${row.id}, Email: ${row.email}, Balance: ${row.balance}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
