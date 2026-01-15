-- Create admin_prompts table for user prompting feature
CREATE TABLE IF NOT EXISTS admin_prompts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_prompts_user_id ON admin_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_prompts_created_at ON admin_prompts(created_at DESC);
