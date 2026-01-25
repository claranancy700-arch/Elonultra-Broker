-- Migration: Add admin config tables
-- Date: 2026-01-25
-- Purpose: Create deposit_addresses and admin_config tables for admin settings management

-- Table: deposit_addresses
-- Stores cryptocurrency wallet addresses for deposit functionality
CREATE TABLE IF NOT EXISTS deposit_addresses (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: admin_config
-- Stores global admin configuration settings
CREATE TABLE IF NOT EXISTS admin_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default deposit addresses
INSERT INTO deposit_addresses (symbol, address) VALUES
  ('BTC', '1A1z7agoat2YTYVHWQVUNSXYZ123456789'),
  ('ETH', '0x742d35Cc6634C0532925a3b844Bc4d0d5Ff6DA13'),
  ('USDT', '0x742d35Cc6634C0532925a3b844Bc4d0d5Ff6DA13'),
  ('USDC', '0x742d35Cc6634C0532925a3b844Bc4d0d5Ff6DA13'),
  ('XRP', 'rN7n7otQDd6FczFgLdltbMFtJ5fB2R5HCR'),
  ('ADA', 'DdzFF4uYvg5uyQKc6vHQXPSLDxtidvPejYUDNRq16C5EHssCFvD5vhrv')
ON CONFLICT (symbol) DO NOTHING;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_symbol ON deposit_addresses(symbol);
CREATE INDEX IF NOT EXISTS idx_admin_config_key ON admin_config(config_key);
