const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testLogin() {
  try {
    console.log('Connecting to DB...');
    const { rows } = await pool.query(
      'SELECT id, email, name FROM users WHERE email=$1',
      ['peterpen@gmail.com']
    );
    
    if (rows.length === 0) {
      console.log('❌ User peterpen@gmail.com NOT found in database');
      console.log('Please sign up first at http://localhost:3000/signup.html');
    } else {
      console.log('✅ User found:', rows[0]);
    }

    // List all users
    console.log('\nAll users in database:');
    const allUsers = await pool.query('SELECT id, email, name FROM users LIMIT 10');
    allUsers.rows.forEach(u => console.log(`  - ${u.email} (${u.name})`));

  } catch (err) {
    console.error('❌ Database error:', err.message);
  } finally {
    pool.end();
  }
}

testLogin();
