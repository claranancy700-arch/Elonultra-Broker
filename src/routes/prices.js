const express = require('express');
const router = express.Router();

// Fallback prices when CoinGecko is unavailable
const FALLBACK_PRICES = {
  bitcoin: { usd: 43500 },
  ethereum: { usd: 2300 },
  binancecoin: { usd: 600 },
  ripple: { usd: 2.50 },
  cardano: { usd: 1.15 },
  solana: { usd: 140 },
  polkadot: { usd: 9.50 },
  dogecoin: { usd: 0.38 },
  'matic-network': { usd: 1.10 },
  'avalanche-2': { usd: 38 },
  cosmos: { usd: 11.50 },
  arbitrum: { usd: 1.85 },
  optimism: { usd: 2.80 },
  litecoin: { usd: 135 },
  'bitcoin-cash': { usd: 530 },
  stellar: { usd: 0.28 },
  chainlink: { usd: 28 },
  uniswap: { usd: 18 },
  aave: { usd: 380 },
  makerdao: { usd: 2800 },
  'curve-dao-token': { usd: 1.08 },
  synthetix: { usd: 5.50 },
  gmx: { usd: 62 },
  dydx: { usd: 2.50 },
  'lido-dao': { usd: 3.80 },
  sui: { usd: 3.50 },
  aptos: { usd: 10.50 },
  near: { usd: 6.50 },
  celestia: { usd: 7.20 },
  mantle: { usd: 0.92 },
  'internet-computer': { usd: 14.50 },
  'hedera-hashgraph': { usd: 0.14 },
  jupiter: { usd: 1.20 },
  raydium: { usd: 0.68 },
  orca: { usd: 1.45 },
  pepe: { usd: 0.00000897 },
  'shiba-inu': { usd: 0.0000195 },
  dogwifcoin: { usd: 3.50 },
  popcatsolana: { usd: 1.28 },
  gala: { usd: 0.095 },
  magic: { usd: 1.35 },
  blur: { usd: 0.58 },
  'ethereum-name-service': { usd: 28 },
  'render-token': { usd: 12.50 },
  tether: { usd: 1.00 },
  'usd-coin': { usd: 1.00 },
  dai: { usd: 1.00 },
  frax: { usd: 0.98 },
};

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

    const symbolList = symbols.split(',').map(s => s.trim());
    const ids = [];
    
    // Handle both symbols (BTC, ETH) and direct IDs (bitcoin, ethereum)
    for (const s of symbolList) {
      const upper = s.toUpperCase();
      if (map[upper]) {
        ids.push(map[upper]);
      } else if (s.toLowerCase() === s) {
        // Already an ID (e.g. 'bitcoin')
        ids.push(s.toLowerCase());
      }
    }
    
    const uniqueIds = Array.from(new Set(ids));
    
    if (uniqueIds.length === 0) {
      console.log('[Prices] No valid symbols/IDs provided:', symbols);
      return res.json({});
    }
    
    console.log('[Prices] Mapped symbols to IDs:', symbolList, '->', uniqueIds);

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
      try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd`;
        console.log('[Fetch] Requesting CoinGecko:', url);

        const response = await fetch(url, { timeout: 15000 });
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
      } catch (err) {
        console.error('[Fetch PROMISE ERROR]', err.message);
        throw err;
      }
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

      // Last resort: fallback prices instead of 503 error
      console.warn('[Fallback] CoinGecko unavailable, falling back to hardcoded prices');
      
      // Filter fallback prices to only requested symbols
      const fallbackPrices = {};
      uniqueIds.forEach(id => {
        if (FALLBACK_PRICES[id]) {
          fallbackPrices[id] = FALLBACK_PRICES[id];
        }
      });
      
      // Cache the fallback prices
      priceCache.data = fallbackPrices;
      priceCache.expiresAt = now + MIN_CACHE_TTL;
      
      res.set('X-Cache', 'FALLBACK');
      return res.json(fallbackPrices);
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

    // Ultimate fallback: hardcoded prices
    console.warn('[Ultimate Fallback] Using hardcoded fallback prices');
    res.set('X-Cache', 'HARDCODED-FALLBACK');
    return res.json(FALLBACK_PRICES);
  }
});

module.exports = router;

