/**
 * Admin Config Controller
 * Handles admin settings and deposit address management via API
 */

const response = require('../utils/response');
const adminConfigService = require('../services/adminConfig.service');

const adminConfigController = {
  /**
   * GET /api/admin/config/deposit-addresses
   * Get all deposit addresses
   */
  async getDepositAddresses(req, res, next) {
    try {
      const addresses = await adminConfigService.getDepositAddresses();
      return response.success(res, { addresses });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/admin/config/deposit-addresses
   * Update one or multiple deposit addresses
   */
  async setDepositAddresses(req, res, next) {
    try {
      const { addresses } = req.body;
      if (!addresses || typeof addresses !== 'object') {
        return response.badRequest(res, 'Invalid addresses object');
      }

      const updated = await adminConfigService.setDepositAddresses(addresses);
      return response.success(res, {
        message: 'Deposit addresses updated successfully',
        addresses: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/config/deposit-address/:symbol
   * Get single deposit address
   */
  async getDepositAddress(req, res, next) {
    try {
      const { symbol } = req.params;
      const address = await adminConfigService.getDepositAddress(symbol);
      if (!address) {
        return response.notFound(res, `No address found for ${symbol}`);
      }
      return response.success(res, { symbol, address });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/admin/config/deposit-address/:symbol
   * Update single deposit address
   */
  async setDepositAddress(req, res, next) {
    try {
      const { symbol } = req.params;
      const { address } = req.body;

      if (!address || typeof address !== 'string') {
        return response.badRequest(res, 'Invalid address');
      }

      const result = await adminConfigService.setDepositAddress(symbol, address);
      return response.success(res, {
        message: `Deposit address for ${symbol} updated`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/config/:key
   * Get config value by key
   */
  async getConfig(req, res, next) {
    try {
      const { key } = req.params;
      const value = await adminConfigService.getConfigValue(key);
      if (value === null) {
        return response.notFound(res, `Config key not found: ${key}`);
      }
      return response.success(res, { key, value });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/admin/config/:key
   * Set config value
   */
  async setConfig(req, res, next) {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (value === undefined || value === null) {
        return response.badRequest(res, 'Value is required');
      }

      await adminConfigService.setConfigValue(key, String(value));
      return response.success(res, {
        message: `Config ${key} updated`,
        key,
        value,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/admin/config
   * Get all config values
   */
  async getAllConfig(req, res, next) {
    try {
      const config = await adminConfigService.getAllConfig();
      return response.success(res, { config });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = adminConfigController;
