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

    console.log('[Markets] Fetching from CoinGecko:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'Elon-Ultra-Broker/1.0' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Markets] CoinGecko returned', response.status, response.statusText);
      return res.status(502).json({ error: 'CoinGecko API returned ' + response.status });
    }

    const data = await response.json();
    console.log('[Markets] Fetched', data.length, 'coins from CoinGecko');

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
    console.error('[Markets] error', err.name, err.message || err);
    
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'CoinGecko API timeout - request took too long' });
    }

    res.status(500).json({ error: 'Unable to fetch markets: ' + (err.message || 'Unknown error') });
  }
});

module.exports = router;
