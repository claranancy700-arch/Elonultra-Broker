# CoinMarketCap API Integration

## Overview
Successfully integrated CoinMarketCap (CMC) API as the primary data source for market data, with CoinGecko and Polygon.io as fallbacks.

## Changes Made

### 1. Environment Configuration (`.env.example`)
Added CMC API key configuration:
```env
# APIs
CMC_API_KEY=your_coinmarketcap_api_key_here
POLYGON_API_KEY=your_polygon_api_key_here
```

### 2. Backend Market Route (`src/routes/markets.js`)

#### Updated `fetchWithRetry()` Function
- Added support for custom headers via a 4th parameter
- Enables API-specific authentication headers (CMC requires `X-CMC_PRO_API_KEY` header)

#### New `fetchFromCoinMarketCap()` Function
- Uses CoinMarketCap's official `v1/cryptocurrency/listings/latest` endpoint
- Fetches cryptocurrency data with USD quotes
- Maps CMC data structure to internal format:
  - `symbol`: Cryptocurrency ticker
  - `price`: Current USD price
  - `change_24h`: 24-hour price change percentage
  - `volume_24h`: 24-hour trading volume
  - `market_cap`: Market capitalization
  - `market_cap_rank`: CMC rank

### 3. Data Fetch Priority
The system now tries APIs in this order:
1. **CoinMarketCap** (primary) - Most reliable, official API
2. **CoinGecko** (fallback) - Free, public alternative
3. **Polygon.io** (fallback) - Enterprise data provider

If all fail, returns cached data (even if expired) or errors.

## Setup Instructions

### 1. Get CMC API Key
1. Visit https://coinmarketcap.com/api/
2. Sign up for a free account
3. Generate an API key from your dashboard
4. Copy your API key

### 2. Configure Environment
Add to `.env` file:
```env
CMC_API_KEY=your_actual_api_key_here
```

### 3. Test Integration
```bash
# Start the server
npm run server:dev

# Test the endpoint
curl http://localhost:5001/api/markets
```

## API Endpoint Details

**CMC Endpoint Used:**
```
GET https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest
Query Parameters:
  - limit: Number of cryptocurrencies to fetch (default: 100, max: 250)
  - start: Starting position (for pagination)
  - convert: Currency for quotes (USD)

Authentication:
  - Header: X-CMC_PRO_API_KEY: [your_api_key]
```

## Rate Limits & Caching

- **CMC Rate Limit**: Free tier = 333 calls/day, Paid = 10K+ calls/day
- **Cache Duration**: 5 minutes (reduces API calls significantly)
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout**: 8 seconds per request

## Benefits

✅ **More Reliable**: Multiple fallback sources ensure service availability  
✅ **Better Data**: Official CMC data is comprehensive and frequently updated  
✅ **Smart Fallbacks**: Automatically uses alternative APIs if primary fails  
✅ **Performance**: 5-minute cache reduces unnecessary API calls  
✅ **Error Handling**: Returns expired cache if all APIs fail  

## Response Format

```javascript
[
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 93725,
    change_24h: 2.45,
    high_24h: 95500,
    low_24h: 91200,
    volume_24h: 24500000000,
    market_cap: 1847200000000,
    market_cap_rank: 1
  },
  // ... more coins
]
```

## Troubleshooting

**Issue**: Getting 401/403 errors
- **Solution**: Verify CMC API key is correct and not expired

**Issue**: Getting 429 (rate limited)
- **Solution**: Check your CMC plan limits or wait for cache to update

**Issue**: Missing data fields
- **Solution**: Some fields may be 0 if CMC doesn't provide them; fallback APIs may have more complete data

## Notes

- The system gracefully degrades if CMC is unavailable
- Free CMC tier provides sufficient data for most use cases
- Consider upgrading to paid plan for higher rate limits if scale increases
