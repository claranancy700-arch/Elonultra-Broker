const express = require('express');
const router = express.Router();

// Lightweight markets endpoint that proxies CoinGecko /markets
// GET /api/markets?per_page=50&page=1
// Returns array of { id, symbol, name, price, change_24h, high_24h, low_24h, volume_24h, market_cap }
router.get('/', async (req, res) => {
  try {
    const per_page = Math.min(250, parseInt(req.query.per_page) || 50);
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=false&price_change_percentage=24h`;

    const response = await fetch(url, { timeout: 15000 });
    if (!response.ok) {
      console.warn('[Markets] CoinGecko returned', response.status);
      return res.status(502).json({ error: 'Failed to fetch external market data' });
    }

    const data = await response.json();
    const mapped = data.map(d => ({
      id: d.id,
      symbol: (d.symbol || '').toUpperCase(),
      name: d.name,
      price: d.current_price,
      change_24h: d.price_change_percentage_24h ?? 0,
      high_24h: d.high_24h,
      low_24h: d.low_24h,
      volume_24h: d.total_volume,
      market_cap: d.market_cap,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('[Markets] error', err.message || err);
    res.status(500).json({ error: 'Unable to fetch markets' });
  }
});

module.exports = router;
