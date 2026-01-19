/**
 * Input Validation Utilities
 */

const validators = {
  /**
   * Validate email format
   */
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * Validate password (min 6 chars)
   */
  isValidPassword(password) {
    return password && password.length >= 6;
  },

  /**
   * Validate positive number
   */
  isValidAmount(amount) {
    const num = Number(amount);
    return !isNaN(num) && num > 0;
  },

  /**
   * Validate user ID (positive integer)
   */
  isValidUserId(userId) {
    const num = parseInt(userId, 10);
    return !isNaN(num) && num > 0;
  },

  /**
   * Validate string is not empty
   */
  isNotEmpty(str) {
    return str && String(str).trim().length > 0;
  },

  /**
   * Validate crypto address (basic)
   */
  isValidCryptoAddress(address, type = null) {
    if (!address || typeof address !== 'string') return false;
    const addr = address.trim();
    if (!addr) return false;

    if (type === 'BTC') return /^(bc1|1|3)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr);
    if (type === 'ETH') return /^0x[a-fA-F0-9]{40}$/.test(addr);
    if (type === 'USDT') return /^T[a-zA-Z0-9]{33}$/.test(addr);
    if (type === 'USDC') return /^0x[a-fA-F0-9]{40}$/.test(addr);

    // Generic check: at least 20 chars, alphanumeric
    return /^[a-zA-Z0-9]{20,}$/.test(addr);
  },

  /**
   * Validate currency code
   */
  isValidCurrency(currency) {
    const valid = ['USD', 'BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA', 'SOL'];
    return valid.includes(String(currency).toUpperCase());
  },

  /**
   * Validate trade type
   */
  isValidTradeType(type) {
    const valid = ['buy', 'sell', 'loss', 'gain'];
    return valid.includes(String(type).toLowerCase());
  },

  /**
   * Validate status
   */
  isValidStatus(status) {
    const valid = ['pending', 'completed', 'failed', 'cancelled'];
    return valid.includes(String(status).toLowerCase());
  },
};

module.exports = validators;
