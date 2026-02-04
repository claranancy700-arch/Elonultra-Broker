const express = require('express');
const router = express.Router();

// In-memory cache for market data (5 minute TTL)
let marketCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Retry logic for API calls
async function fetchWithRetry(url, maxRetries = 3, timeout = 8000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Elon-Ultra-Broker/1.0',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      console.warn(`[Markets] Attempt ${i + 1}: CoinGecko returned ${response.status}`);
      
      // If rate limited, wait before retrying
      if (response.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.warn(`[Markets] Attempt ${i + 1} failed:`, err.message);
      
      if (i < maxRetries - 1 && err.name !== 'AbortError') {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw new Error('Failed to fetch after retries');
}

// GET /api/markets - fetch live market data
router.get('/', async (req, res) => {
  try {
    const per_page = Math.min(250, parseInt(req.query.per_page) || 100);
    const page = Math.max(1, parseInt(req.query.page) || 1);

    // Check cache
    if (marketCache.data && marketCache.timestamp) {
      const cacheAge = Date.now() - marketCache.timestamp;
      if (cacheAge < marketCache.CACHE_DURATION) {
        console.log('[Markets] Serving from cache (age:', Math.round(cacheAge / 1000), 's)');
        return res.json(marketCache.data);
      }
    }

    console.log('[Markets] Cache expired, fetching fresh data...');

    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=false&price_change_percentage=24h&locale=en`;

    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[Markets] No data from CoinGecko');
      return res.status(502).json({ error: 'CoinGecko returned no data' });
    }

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
      market_cap_rank: d.market_cap_rank,
      image: d.image, // Include image URL
    }));

    // Cache the result
    marketCache.data = mapped;
    marketCache.timestamp = Date.now();

    console.log('[Markets] Fetched and cached', mapped.length, 'coins');
    res.json(mapped);

  } catch (err) {
    console.error('[Markets] Error:', err.message);

    // Try to return cached data even if expired
    if (marketCache.data) {
      console.log('[Markets] API failed but returning expired cache');
      return res.json(marketCache.data);
    }

    res.status(502).json({ 
      error: 'Unable to fetch market data. API is temporarily unavailable.',
      message: err.message 
    });
  }
});

module.exports = router;
