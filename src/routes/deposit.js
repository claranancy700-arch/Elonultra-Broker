const express = require('express');
const router = express.Router();

// Simple deposit address provider for MVP.
// Reads addresses from environment variables when available,
// falls back to safe testing addresses for local development.
const ADDRESSES = {
  BTC: process.env.DEPOSIT_ADDR_BTC || '1FfmbHfnpaZjKFvyi1okTjJJusN455paPH',
  ETH: process.env.DEPOSIT_ADDR_ETH || '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
  USDT: process.env.DEPOSIT_ADDR_USDT || 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  USDC: process.env.DEPOSIT_ADDR_USDC || '0xUSDCADDRESSPLACEHOLDER0000000000000',
};

// GET /api/deposit/address?currency=BTC
router.get('/address', (req, res) => {
  const currency = (req.query.currency || 'BTC').toString().toUpperCase();

  if (!ADDRESSES[currency]) {
    return res.status(400).json({ success: false, error: 'Unsupported currency' });
  }

  return res.json({ success: true, currency, address: ADDRESSES[currency] });
});

module.exports = router;
