const express = require('express');
const router = express.Router();
const db = require('../db');

// In-memory cache for deposit addresses (loaded from DB on startup)
let depositAddresses = {
  BTC: process.env.DEPOSIT_ADDR_BTC || '1FfmbHfnpaZjKFvyi1okTjJJusN455paPH',
  ETH: process.env.DEPOSIT_ADDR_ETH || '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
  USDT: process.env.DEPOSIT_ADDR_USDT || 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  USDC: process.env.DEPOSIT_ADDR_USDC || '0xUSDCADDRESSPLACEHOLDER0000000000000',
};

// Helper to get current ADMIN_KEY dynamically
function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || null;
}

// GET /api/deposit/address?currency=BTC - get a single deposit address (public)
router.get('/address', (req, res) => {
  const currency = (req.query.currency || 'BTC').toString().toUpperCase();

  if (!depositAddresses[currency]) {
    return res.status(400).json({ success: false, error: 'Unsupported currency' });
  }

  return res.json({ success: true, currency, address: depositAddresses[currency] });
});

// GET /api/deposit/addresses - get all deposit addresses (admin only)
router.get('/addresses', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const ADMIN_KEY = getAdminKey();

  if (!ADMIN_KEY || !adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  return res.json({ success: true, addresses: depositAddresses });
});

// POST /api/deposit/addresses - set deposit addresses (admin only)
router.post('/addresses', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const ADMIN_KEY = getAdminKey();

  if (!ADMIN_KEY || !adminKey || adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { addresses } = req.body;
  if (!addresses || typeof addresses !== 'object') {
    return res.status(400).json({ error: 'addresses object required' });
  }

  // Update addresses in memory
  const validSymbols = ['BTC', 'ETH', 'USDT', 'USDC'];
  for (const symbol of validSymbols) {
    if (addresses[symbol]) {
      depositAddresses[symbol] = String(addresses[symbol]).trim();
    }
  }

  return res.json({ success: true, addresses: depositAddresses });
});

module.exports = router;
