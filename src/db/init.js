const db = require('./index');

async function ensureSchema() {
  try {
    // Core user table (keeps the backend runnable even if migrations weren't run)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User financial + simulator fields
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS balance NUMERIC(20,8) DEFAULT 0`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_value NUMERIC(20,8) DEFAULT 0`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS fullName VARCHAR(255)`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    // Optional tax identification for users (used to determine loss reporting)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_id VARCHAR(255)`);
    // Soft-delete / active flag for admin controls
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);

    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_enabled BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_paused BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_next_run_at TIMESTAMP`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_last_run_at TIMESTAMP`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sim_started_at TIMESTAMP`);

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

    // withdrawals table (includes fee gating fields)
    await db.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(18, 8) NOT NULL,
        crypto_type VARCHAR(50) NOT NULL,
        crypto_address VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'fee_required',
        txn_hash VARCHAR(255),
        error_message TEXT,
        balance_snapshot NUMERIC(20,8),
        fee_amount NUMERIC(20,8),
        fee_currency VARCHAR(10) DEFAULT 'USDT',
        fee_status VARCHAR(20) DEFAULT 'required',
        fee_confirmed_at TIMESTAMP,
        fee_confirmed_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        CONSTRAINT positive_amount CHECK (amount > 0)
      )
    `);

    // Safely add fee_status column if it doesn't exist
    try {
      await db.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_status VARCHAR(20) DEFAULT 'required'`);
    } catch (e) {
      debug('fee_status column might exist:', e.message);
    }
    try {
      await db.query(`CREATE INDEX IF NOT EXISTS idx_withdrawals_fee_status ON withdrawals(fee_status)`);
    } catch (e) {
      debug('fee_status index creation:', e.message);
    }

    // Ensure balance_snapshot and fee_amount exist (safe ALTER for older DBs)
    try {
      await db.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS balance_snapshot NUMERIC(20,8)`);
    } catch (e) { debug('ALTER TABLE withdrawals balance_snapshot failed:', e.message); }
    try {
      await db.query(`ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(20,8)`);
    } catch (e) { debug('ALTER TABLE withdrawals fee_amount failed:', e.message); }

    // trades table (simulated trade history)
    await db.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        asset VARCHAR(20) NOT NULL,
        amount DECIMAL(18, 8) NOT NULL,
        price DECIMAL(18, 8) NOT NULL,
        total DECIMAL(18, 8) NOT NULL,
        balance_before DECIMAL(18, 8) NOT NULL,
        balance_after DECIMAL(18, 8) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        is_simulated BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT positive_trade_amount CHECK (amount > 0),
        CONSTRAINT positive_trade_price CHECK (price > 0)
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_trades_is_simulated ON trades(is_simulated)`);

    // Admin prompts table (prompts issued by admin to individual users or broadcast)
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_prompts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        is_read BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_admin_prompts_user_id ON admin_prompts(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_admin_prompts_created_at ON admin_prompts(created_at DESC)`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_prompt_responses (
        id SERIAL PRIMARY KEY,
        prompt_id INTEGER REFERENCES admin_prompts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        response TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Ensure 'is_active' and 'is_read' exist for admin_prompts (safe ALTER for existing DBs)
    try {
      await db.query("ALTER TABLE admin_prompts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE");
    } catch (e) { console.warn('ALTER TABLE admin_prompts is_active failed:', e && e.message); }
    try {
      await db.query("ALTER TABLE admin_prompts ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE");
    } catch (e) { console.warn('ALTER TABLE admin_prompts is_read failed:', e && e.message); }

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
        {
          client_name: 'John Smith',
          title: 'Verified Client',
          content:
            'The trading service has been honest, transparent, and consistently efficient. Their support agents guided me clearly through every step and I always knew what was happening with my account.',
          rating: 5,
          is_featured: true,
        },
        {
          client_name: 'Sarah Johnson',
          title: 'Satisfied Investor',
          content:
            'I was skeptical at first, but the results and the communication have been clear and professional. The service agents are responsive and the trading updates are consistent.',
          rating: 5,
          is_featured: true,
        },
        {
          client_name: 'Michael Chen',
          title: 'Long-term Client',
          content:
            'What I value most is the transparency. The trading history is easy to understand, and the support team explains everything without pressure. Very reliable service.',
          rating: 5,
          is_featured: true,
        },
        {
          client_name: 'Emma Wilson',
          title: 'Client',
          content:
            'Fast support responses, clear processes, and consistent trading activity. Everything feels organized and professional.',
          rating: 5,
          is_featured: false,
        },
        {
          client_name: 'David Martinez',
          title: 'Client',
          content:
            'The agents are respectful and helpful, and the service is straightforward. I can see the updates and I feel confident in the process.',
          rating: 5,
          is_featured: false,
        },
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
