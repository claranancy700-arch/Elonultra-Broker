const express = require('express');
const router = express.Router();

// In-memory cache for market data (5 minute TTL)
let marketCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const CMC_API_KEY = process.env.CMC_API_KEY;
const COINGECKO_BACKUP = true; // Use CoinGecko as fallback

// Retry logic for API calls
async function fetchWithRetry(url, maxRetries = 3, timeout = 8000, customHeaders = {}) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers = {
        'User-Agent': 'Elon-Ultra-Broker/1.0',
        'Accept': 'application/json',
        ...customHeaders,
      };

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      console.warn(`[Markets] Attempt ${i + 1}: API returned ${response.status}`);
      
      if (response.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (err) {
      console.warn(`[Markets] Attempt ${i + 1} failed:`, err.message);
      
      if (i < maxRetries - 1 && err.name !== 'AbortError') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  throw new Error('Failed to fetch after retries');
}

// Fetch from Polygon.io
async function fetchFromPolygon() {
  if (!POLYGON_API_KEY) {
    console.warn('[Markets] Polygon API key not configured');
    throw new Error('Polygon API key not configured');
  }

  console.log('[Markets] Fetching from Polygon.io...');

  // Polygon.io v3 tickers endpoint (metadata). Note: v3 provides ticker metadata; price fields may be missing.
  const url = `https://api.polygon.io/v3/reference/tickers?market=crypto&active=true&limit=${per_page||100}&apiKey=${POLYGON_API_KEY}`;

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('Polygon returned no data');
  }

  // Map Polygon v3 format to our format. Price information is not provided in this endpoint,
  // so we set price to 0 and rely on CoinGecko for actual pricing (CoinGecko is primary).
  const mapped = data.results.map((ticker, index) => {
    const raw = (ticker.ticker || '').toUpperCase();
    const symbol = (ticker.base_currency_symbol || raw.replace('X:', ''))?.toUpperCase();

    return {
      id: raw.toLowerCase(),
      symbol: symbol,
      name: ticker.name || symbol,
      price: 0,
      change_24h: 0,
      high_24h: 0,
      low_24h: 0,
      volume_24h: 0,
      market_cap: 0,
      market_cap_rank: index + 1,
    };
  });

  return mapped;
}

// Fetch from CoinMarketCap (pro-api.coinmarketcap.com)
async function fetchFromCoinMarketCap(per_page = 100, page = 1) {
  if (!CMC_API_KEY) {
    console.warn('[Markets] CMC API key not configured');
    throw new Error('CMC API key not configured');
  }

  console.log('[Markets] Fetching from CoinMarketCap...');

  // CMC cryptocurrency listings endpoint with quotes in USD
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=${per_page}&start=${(page - 1) * per_page + 1}&convert=USD`;

  const response = await fetchWithRetry(url, 3, 8000, {
    'X-CMC_PRO_API_KEY': CMC_API_KEY,
  });
  const data = await response.json();

  if (!data.data || data.data.length === 0) {
    throw new Error('CoinMarketCap returned no data');
  }

  // Map CMC format to our format
  return data.data.map((coin, index) => {
    const quote = coin.quote?.USD || {};
    
    return {
      id: coin.slug || coin.symbol.toLowerCase(),
      symbol: (coin.symbol || '').toUpperCase(),
      name: coin.name,
      price: quote.price || 0,
      change_24h: quote.percent_change_24h || 0,
      high_24h: quote.price || 0, // CMC doesn't provide 24h high/low in basic endpoint
      low_24h: quote.price || 0,
      volume_24h: quote.volume_24h || 0,
      market_cap: quote.market_cap || 0,
      market_cap_rank: coin.cmc_rank || index + 1,
    };
  });
}

// Fetch from CoinGecko (fallback)
async function fetchFromCoinGecko(per_page = 100, page = 1) {
  console.log('[Markets] Fetching from CoinGecko...');

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=${page}&sparkline=false&price_change_percentage=24h&locale=en`;

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('CoinGecko returned no data');
  }

  return data.map(d => ({
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
  }));
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

    let mapped;
    let dataSource = 'unknown';

    try {
      // Try CoinMarketCap first (primary)
      mapped = await fetchFromCoinMarketCap(per_page, page);
      dataSource = 'CoinMarketCap (primary)';
    } catch (cmcErr) {
      console.warn('[Markets] CoinMarketCap failed:', cmcErr.message);

      try {
        // Try CoinGecko as fallback
        mapped = await fetchFromCoinGecko(per_page, page);
        dataSource = 'CoinGecko (fallback)';
      } catch (geckoErr) {
        console.warn('[Markets] CoinGecko failed:', geckoErr.message);

        // Try Polygon.io as fallback
        try {
          mapped = await fetchFromPolygon(per_page);
          dataSource = 'Polygon.io (fallback)';
        } catch (polygonErr) {
          console.error('[Markets] Polygon.io also failed:', polygonErr.message);

          // Try to return cached data even if expired
          if (marketCache.data) {
            console.log('[Markets] Returning expired cache');
            return res.json(marketCache.data);
          }

          throw polygonErr;
        }
      }
    }

    // Cache the result
    marketCache.data = mapped;
    marketCache.timestamp = Date.now();

    console.log(`[Markets] Fetched ${mapped.length} coins from ${dataSource}`);
    res.json(mapped);

  } catch (err) {
    console.error('[Markets] Error:', err.message);

    // Try to return cached data even if expired
    if (marketCache.data) {
      console.log('[Markets] API failed but returning expired cache');
      return res.json(marketCache.data);
    }

    res.status(502).json({ 
      error: 'Unable to fetch market data. All data sources unavailable.',
      message: err.message 
    });
  }
});

module.exports = router;
