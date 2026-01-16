-- Add profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fullName VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
