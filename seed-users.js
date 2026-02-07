const db = require('./src/db');
const bcrypt = require('bcryptjs');

async function seedUsers() {
  try {
    const testUsers = [
      { name: 'Alice Smith', email: 'alice@example.com', password: 'password123' },
      { name: 'Bob Johnson', email: 'bob@example.com', password: 'password123' },
      { name: 'Charlie Brown', email: 'charlie@example.com', password: 'password123' },
      { name: 'Diana Prince', email: 'diana@example.com', password: 'password123' },
      { name: 'Eve Taylor', email: 'eve@example.com', password: 'password123' },
    ];

    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existingUser.rows.length === 0) {
        // Hash password
        const hash = await bcrypt.hash(user.password, 10);
        // Insert user with $0 initial balance - only deposits add funds
        const result = await db.query(
          'INSERT INTO users(name, email, password_hash, balance, portfolio_value) VALUES($1, $2, $3, 0, 0) RETURNING id, email, balance',
          [user.name, user.email, hash]
        );
        console.log(`✓ Created user: ${result.rows[0].email} (ID: ${result.rows[0].id})`);

        // Create portfolio row
        await db.query(
          'INSERT INTO portfolio(user_id) VALUES($1) ON CONFLICT (user_id) DO NOTHING',
          [result.rows[0].id]
        );
      } else {
        console.log(`✓ User already exists: ${user.email}`);
      }
    }

    // List all users
    const allUsers = await db.query('SELECT id, email, balance FROM users ORDER BY id');
    console.log(`\nTotal users in DB: ${allUsers.rows.length}`);
    allUsers.rows.forEach(u => {
      console.log(`  ID: ${u.id}, Email: ${u.email}, Balance: ${u.balance}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error seeding users:', err.message);
    process.exit(1);
  }
}

seedUsers();
