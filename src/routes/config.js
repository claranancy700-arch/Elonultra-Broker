/**
 * Admin Config Routes
 * Endpoints for managing admin settings and deposit addresses
 */

const express = require('express');
const router = express.Router();
const adminConfigController = require('../controllers/adminConfig.controller');

// Read ADMIN_KEY dynamically
function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || null;
}

// Verify admin key middleware
function requireAdminKey(req, res, next) {
  const provided = req.headers['x-admin-key'];
  const ADMIN_KEY = getAdminKey();
  if (!ADMIN_KEY) {
    return res.status(503).json({ error: 'Admin API key not configured' });
  }
  if (!provided || provided !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

// Apply admin key verification to all config routes
router.use(requireAdminKey);

// Deposit addresses endpoints
router.get('/deposit-addresses', adminConfigController.getDepositAddresses);
router.post('/deposit-addresses', adminConfigController.setDepositAddresses);
router.get('/deposit-address/:symbol', adminConfigController.getDepositAddress);
router.put('/deposit-address/:symbol', adminConfigController.setDepositAddress);

// Generic config endpoints
router.get('/:key', adminConfigController.getConfig);
router.post('/:key', adminConfigController.setConfig);
router.get('/', adminConfigController.getAllConfig);

module.exports = router;
