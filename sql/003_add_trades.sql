-- Add trades table for simulated trade history
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'buy', 'sell', 'simulated'
  asset VARCHAR(20) NOT NULL, -- 'BTC', 'ETH', 'USDT', etc.
  amount DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  total DECIMAL(18, 8) NOT NULL,
  balance_before DECIMAL(18, 8) NOT NULL,
  balance_after DECIMAL(18, 8) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'pending', 'failed'
  is_simulated BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT positive_price CHECK (price > 0)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at);
CREATE INDEX IF NOT EXISTS idx_trades_is_simulated ON trades(is_simulated);
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, created_at DESC);

-- Add balance column to users if not exists (for atomic updates)
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(18, 8) DEFAULT 1000.00;
