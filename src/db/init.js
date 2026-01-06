const db = require('./index');

async function ensureSchema() {
  try {
    // admin_audit table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_audit (
        id SERIAL PRIMARY KEY,
        admin_key TEXT,
        action TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'buy', 'sell', 'adjustment', 'credit', 'trade')),
        amount NUMERIC(20,8) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'completed',
        reference VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // portfolio table
    await db.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        btc_balance NUMERIC(30,8) DEFAULT 0,
        eth_balance NUMERIC(30,8) DEFAULT 0,
        usdt_balance NUMERIC(30,8) DEFAULT 0,
        usdc_balance NUMERIC(30,8) DEFAULT 0,
        xrp_balance NUMERIC(30,8) DEFAULT 0,
        ada_balance NUMERIC(30,8) DEFAULT 0,
        usd_value NUMERIC(30,8) DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure users table has portfolio_value column
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_value NUMERIC(20,8) DEFAULT 0`);

    // testimonies table
    await db.query(`
      CREATE TABLE IF NOT EXISTS testimonies (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        client_image VARCHAR(500),
        title VARCHAR(255),
        rating INT CHECK (rating >= 1 AND rating <= 5),
        content TEXT NOT NULL,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed initial testimonies if table is empty
    const count = await db.query('SELECT COUNT(*) FROM testimonies');
    if (count.rows[0].count == 0) {
      const seedTestimonies = [
        { client_name: 'John Smith', title: 'CEO, Tech Ventures', content: 'ELON ULTRA ELONS has completely transformed my crypto trading experience. The platform is intuitive, secure, and I have increased my portfolio by 85% since joining. Highly recommended!', rating: 5, is_featured: true },
        { client_name: 'Sarah Johnson', title: 'Entrepreneur', content: 'Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable. Five stars!', rating: 5, is_featured: true },
        { client_name: 'Michael Chen', title: 'Hedge Fund Manager', content: 'The real-time data and low fees make ELON ULTRA ELONS my go-to platform. Professional-grade tools at an unbeatable price point.', rating: 5, is_featured: true },
        { client_name: 'Emma Wilson', title: 'Investment Advisor', content: 'Professional tools with a beginner-friendly interface. This platform has the perfect balance between power and simplicity.', rating: 5, is_featured: false },
        { client_name: 'David Martinez', title: 'Day Trader', content: 'Faster execution than any other exchange I have used. I have saved thousands in fees since switching to ELON ULTRA ELONS.', rating: 5, is_featured: false },
      ];
      
      for (const t of seedTestimonies) {
        await db.query(
          'INSERT INTO testimonies (client_name, title, content, rating, is_featured) VALUES ($1, $2, $3, $4, $5)',
          [t.client_name, t.title, t.content, t.rating, t.is_featured]
        );
      }
      console.log('Seeded 5 initial testimonies');
    }

    console.log('Schema check completed');
  } catch (err) {
    console.error('Schema init error:', err.message || err);
  }
}

module.exports = { ensureSchema };
