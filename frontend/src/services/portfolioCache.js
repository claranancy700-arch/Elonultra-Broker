/**
 * Frontend portfolio cache service
 * Provides fallback caching and retry logic for portfolio data
 * 
 * Why this exists:
 * - Backend may return 503 if CoinGecko is unavailable
 * - Dashboard shouldn't break when portfolio endpoint fails
 * - Users should see "last known" portfolio during API issues
 */

const CACHE_KEY = 'portfolio_cache_v1';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const portfolioCache = {
  /**
   * Save portfolio to localStorage
   */
  save(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Failed to cache portfolio:', e);
    }
  },

  /**
   * Get cached portfolio if available and not expired
   */
  get() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isExpired = age > CACHE_EXPIRY;

      if (isExpired) {
        console.log('[Portfolio Cache] Cache expired after', Math.round(age / 1000), 'seconds');
        this.clear();
        return null;
      }

      console.log('[Portfolio Cache] Using cached portfolio (age:', Math.round(age / 1000), 'seconds)');
      return { ...data, _isCached: true, _cacheAge: age };
    } catch (e) {
      console.warn('Failed to read portfolio cache:', e);
      return null;
    }
  },

  /**
   * Clear cached portfolio
   */
  clear() {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      console.warn('Failed to clear portfolio cache:', e);
    }
  },
};

/**
 * Retry logic with exponential backoff
 * Helps handle temporary CoinGecko outages
 */
export async function fetchWithRetry(fetcher, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Fetch Retry] Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await fetcher();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;

      // Only retry on 503 (Service Unavailable) and network errors
      const should503Retry = error.response?.status === 503;
      const shouldNetworkRetry = !error.response && attempt < maxRetries; // Network error

      if (!should503Retry && !shouldNetworkRetry) {
        throw error; // Don't retry other errors
      }

      if (!isLastAttempt) {
        const delayMs = Math.pow(2, attempt) * 500; // Exponential backoff: 500ms, 1s, 2s...
        console.log(`[Fetch Retry] Failed (${error.response?.status || 'network error'}), retrying in ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
