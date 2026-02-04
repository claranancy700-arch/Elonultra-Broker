# Polygon.io Integration Setup

## What is Polygon.io?

Polygon.io is a financial data provider offering real-time and historical market data for:
- **Crypto markets** - Real-time crypto tickers and OHLC data
- **Stock markets** - US equities, options, forex
- **Economic data** - Aggregated market information

## Setup Instructions

### 1. Get Your Free API Key

1. Visit https://polygon.io (or https://polygon.io/crypto for crypto-specific)
2. Sign up for a free account
3. Go to your **Dashboard** → **API Keys**
4. Copy your API key

### 2. Add to Environment

In your `.env` file (root directory), add:

```env
POLYGON_API_KEY=your_api_key_here
```

### 3. Restart Your Server

After adding the key, restart your backend:

```bash
# Development
npm run dev

# Or manually
node src/server.js
```

## How It Works

The backend now uses this priority:

1. **Try Polygon.io first** - Fetches crypto tickers
2. **Fallback to CoinGecko** - If Polygon fails or key not set
3. **Use cached data** - If both APIs fail

### API Response Format

Both providers are normalized to this format:

```json
{
  "id": "BTC",
  "symbol": "BTC",
  "name": "Bitcoin",
  "price": 42150.50,
  "change_24h": -2.5,
  "high_24h": 43200.00,
  "low_24h": 41800.00,
  "volume_24h": 1250000000,
  "market_cap": 830000000000,
  "market_cap_rank": 1
}
```

## Free Tier Limits

| Limit | Free Tier |
|-------|-----------|
| API Calls/Minute | 5 |
| Historical Data | 2+ years |
| Real-time Data | Yes |
| Max Results | 250 per request |

## Troubleshooting

**Markets endpoint returns empty?**
- Polygon.io API key not set → Falls back to CoinGecko
- Check `POLYGON_API_KEY` in `.env`

**Getting 429 (rate limited)?**
- Free tier allows 5 calls/minute
- Backend caches for 5 minutes → reduces actual API calls
- Wait 60 seconds before retrying

**Seeing old prices?**
- Cache is serving stale data (normal, expected)
- Wait up to 5 minutes for fresh API call
- Or restart server to clear cache

## Polygon.io Endpoints Used

- **Crypto Tickers**: `GET /v1/marketplaces/crypto/tickers`
- **Parameters**: `limit=100&sort=lastquote`
- **Rate Limit**: 5 req/min (free), 600+ req/min (paid)

## Why Polygon.io?

✅ **Professional-grade data** - Used by institutional investors  
✅ **Reliable** - 99.9% uptime SLA  
✅ **Fast** - Low-latency real-time data  
✅ **Free tier** - Good for development/demo  
✅ **Fallback safety** - CoinGecko backup if issues  

## Switching Back to CoinGecko Only

To use only CoinGecko (and skip Polygon):

Edit `src/routes/markets.js`, line 14:
```javascript
const COINGECKO_BACKUP = false; // Disable fallback
```

Then Polygon errors will fail immediately instead of trying CoinGecko.

---

**Deployed at**: https://elonultra-broker.onrender.com  
**Markets endpoint**: `GET /api/markets?per_page=100&page=1`
