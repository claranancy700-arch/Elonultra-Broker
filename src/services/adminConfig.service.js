/**
 * Admin Config Service
 * Manages admin settings and deposit addresses server-side
 */

const db = require('../db');

const adminConfigService = {
  /**
   * Get all deposit addresses
   */
  async getDepositAddresses() {
    const result = await db.query(
      'SELECT symbol, address FROM deposit_addresses ORDER BY symbol ASC'
    );
    const addresses = {};
    result.rows.forEach(row => {
      addresses[row.symbol] = row.address;
    });
    return addresses;
  },

  /**
   * Get single deposit address
   */
  async getDepositAddress(symbol) {
    const result = await db.query(
      'SELECT address FROM deposit_addresses WHERE symbol = $1',
      [symbol.toUpperCase()]
    );
    return result.rows[0]?.address || null;
  },

  /**
   * Update deposit address
   */
  async setDepositAddress(symbol, address) {
    const result = await db.query(
      `INSERT INTO deposit_addresses (symbol, address) 
       VALUES ($1, $2) 
       ON CONFLICT (symbol) 
       DO UPDATE SET address = $2, updated_at = NOW()
       RETURNING symbol, address`,
      [symbol.toUpperCase(), address]
    );
    return result.rows[0];
  },

  /**
   * Update multiple deposit addresses
   */
  async setDepositAddresses(addressMap) {
    const results = {};
    for (const [symbol, address] of Object.entries(addressMap)) {
      const result = await this.setDepositAddress(symbol, address);
      results[symbol] = result.address;
    }
    return results;
  },

  /**
   * Get config value by key
   */
  async getConfigValue(key) {
    const result = await db.query(
      'SELECT config_value FROM admin_config WHERE config_key = $1',
      [key]
    );
    return result.rows[0]?.config_value || null;
  },

  /**
   * Set config value
   */
  async setConfigValue(key, value) {
    await db.query(
      `INSERT INTO admin_config (config_key, config_value) 
       VALUES ($1, $2) 
       ON CONFLICT (config_key) 
       DO UPDATE SET config_value = $2, updated_at = NOW()`,
      [key, value]
    );
    return true;
  },

  /**
   * Get all config values
   */
  async getAllConfig() {
    const result = await db.query('SELECT config_key, config_value FROM admin_config');
    const config = {};
    result.rows.forEach(row => {
      config[row.config_key] = row.config_value;
    });
    return config;
  },
};

module.exports = adminConfigService;
