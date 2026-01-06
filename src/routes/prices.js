const express = require('express');
const router = express.Router();

// In-memory cache for prices with more aggressive TTL
let priceCache = { data: null, expiresAt: 0 };
const CACHE_TTL = 120 * 1000; // 120 seconds (doubled to be safer)
const MIN_CACHE_TTL = 30 * 1000; // Keep cache for at least 30 seconds even on rate-limit

// Request throttling to prevent multiple simultaneous CoinGecko requests
let isFetching = false;
let fetchPromise = null;

// GET /api/prices?symbols=BTC,ETH,USDT,USDC,XRP,ADA
// Returns: { bitcoin: { usd: 43250 }, ethereum: { usd: 2650 }, ... }
router.get('/', async (req, res) => {
  try {
    const { symbols } = req.query;
    if (!symbols) return res.status(400).json({ error: 'symbols query param required' });

    // Map symbols to CoinGecko ids (50+ major cryptocurrencies)
    const map = {
      // Major Layer 1s
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      XRP: 'ripple',
      ADA: 'cardano',
      SOL: 'solana',
      DOT: 'polkadot',
      // Alt L1s
      DOGE: 'dogecoin',
      MATIC: 'matic-network',
      AVAX: 'avalanche-2',
      ATOM: 'cosmos',
      // Layer 2s
      ARB: 'arbitrum',
      OP: 'optimism',
      // Major Alts
      LTC: 'litecoin',
      BCH: 'bitcoin-cash',
      XLM: 'stellar',
      // DeFi
      LINK: 'chainlink',
      UNI: 'uniswap',
      AAVE: 'aave',
      MKR: 'makerdao',
      CRV: 'curve-dao-token',
      SNX: 'synthetix',
      GMX: 'gmx',
      DYDX: 'dydx',
      LIDO: 'lido-dao',
      // Exchange Tokens
      // Emerging Layer 1s
      SUI: 'sui',
      APT: 'aptos',
      NEAR: 'near',
      TIA: 'celestia',
      MNT: 'mantle',
      ICP: 'internet-computer',
      HBAR: 'hedera-hashgraph',
      // DEX/AMM (Solana ecosystem)
      JUP: 'jupiter',
      RAY: 'raydium',
      ORCA: 'orca',
      // Meme coins
      PEPE: 'pepe',
      SHIB: 'shiba-inu',
      WIF: 'dogwifcoin',
      POPCAT: 'popcatsolana',
      // NFT/Gaming
      GALA: 'gala',
      MAGIC: 'magic',
      // Other DeFi
      BLUR: 'blur',
      ENS: 'ethereum-name-service',
      RENDER: 'render-token',
      // Stablecoins
      USDT: 'tether',
      USDC: 'usd-coin',
      DAI: 'dai',
      FRAX: 'frax',
    };

    const symbolList = symbols.split(',').map(s => s.toUpperCase().trim());
    const ids = Array.from(new Set(symbolList.map(s => map[s]).filter(Boolean)));

    if (ids.length === 0) {
      return res.json({});
    }

    // Check cache first
    const now = Date.now();
    if (priceCache.data && now < priceCache.expiresAt) {
      console.log('[Cache HIT] Returning cached prices, expires in', Math.round((priceCache.expiresAt - now) / 1000), 'seconds');
      res.set('X-Cache', 'HIT');
      return res.json(priceCache.data);
    }

    // If cache is stale but we're already fetching, wait for that fetch
    if (isFetching && fetchPromise) {
      console.log('[Cache WAIT] Waiting for in-flight CoinGecko request...');
      try {
        const prices = await fetchPromise;
        res.set('X-Cache', 'WAITING');
        return res.json(prices);
      } catch (err) {
        console.error('In-flight fetch failed, falling back to stale cache');
        if (priceCache.data) {
          res.set('X-Cache', 'STALE');
          return res.json(priceCache.data);
        }
        throw err;
      }
    }

    // Fetch from CoinGecko
    isFetching = true;
    fetchPromise = (async () => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
      console.log('[Fetch] Requesting CoinGecko:', url);

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('[Fetch FAIL] CoinGecko returned status:', response.status);
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const prices = await response.json();
      console.log('[Fetch SUCCESS] CoinGecko returned prices');
      
      // Cache the result
      priceCache.data = prices;
      priceCache.expiresAt = now + CACHE_TTL;
      
      return prices;
    })();

    try {
      const prices = await fetchPromise;
      res.set('X-Cache', 'MISS');
      return res.json(prices);
    } catch (err) {
      console.error('[Fetch ERROR]', err.message);
      
      // On any error (429, timeout, etc.), return stale cache if available
      if (priceCache.data) {
        console.log('[Fallback] Returning stale cache due to fetch error');
        // Extend the TTL slightly to give CoinGecko time to recover
        priceCache.expiresAt = Math.max(priceCache.expiresAt, now + MIN_CACHE_TTL);
        res.set('X-Cache', 'STALE-FALLBACK');
        return res.json(priceCache.data);
      }

      // No cache available; return error
      res.status(503).json({ error: 'Prices unavailable, please try again' });
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  } catch (err) {
    console.error('[Endpoint ERROR]', err.message || err);
    
    // Final fallback to stale cache
    if (priceCache.data) {
      console.log('[Final Fallback] Returning stale cache due to endpoint error');
      res.set('X-Cache', 'ERROR-FALLBACK');
      return res.json(priceCache.data);
    }

    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

module.exports = router;

