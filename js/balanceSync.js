/**
 * Balance Sync Manager
 * GOLD STANDARD: Database is single source of truth
 * Frontend MUST NEVER calculate or store balance locally
 * Every balance display = fetch from API
 */

const BalanceSync = (() => {
  let currentBalance = null;
  let lastSyncTime = 0;
  const SYNC_INTERVAL = 5000; // Poll every 5 seconds
  const CACHE_TTL = 3000; // Cache for 3 seconds max

  /**
   * Fetch fresh balance from API
   * Always calls /api/auth/me to get live server state
   */
  async function fetchBalanceFromAPI() {
    try {
      if (!AuthService || !AuthService.isAuthenticated()) {
        console.warn('[BalanceSync] Not authenticated');
        return null;
      }

      const headers = Object.assign({ 'Content-Type': 'application/json' }, AuthService.getAuthHeader());
      const resp = await fetch((AuthService.API_BASE || '/api') + '/auth/me', { headers });

      if (!resp.ok) {
        console.warn('[BalanceSync] Failed to fetch balance, status:', resp.status);
        return null;
      }

      const data = await resp.json();
      const balance = data?.data?.user?.balance ?? data?.user?.balance ?? null;

      if (balance !== null && !isNaN(balance)) {
        currentBalance = Number(balance);
        lastSyncTime = Date.now();
        console.log('[BalanceSync] Fetched from API:', currentBalance);
        return currentBalance;
      }

      return null;
    } catch (err) {
      console.error('[BalanceSync] API fetch error:', err);
      return null;
    }
  }

  /**
   * Get current balance (uses cache if fresh, otherwise fetches)
   */
  async function getBalance() {
    const now = Date.now();
    const isCacheFresh = lastSyncTime && (now - lastSyncTime) < CACHE_TTL;

    if (isCacheFresh && currentBalance !== null) {
      console.log('[BalanceSync] Using cached balance:', currentBalance);
      return currentBalance;
    }

    return fetchBalanceFromAPI();
  }

  /**
   * Force refresh balance immediately
   */
  async function refreshBalance() {
    console.log('[BalanceSync] Force refresh');
    lastSyncTime = 0; // Invalidate cache
    return fetchBalanceFromAPI();
  }

  /**
   * Update UI element with balance
   */
  async function updateBalanceDisplay(elementId = 'available-balance') {
    const balance = await getBalance();
    if (balance !== null) {
      const elem = document.getElementById(elementId);
      if (elem) {
        elem.textContent = '$' + Number(balance).toFixed(2);
      }
    }
  }

  /**
   * Start background sync (polls API every 5 seconds)
   */
  function startSync() {
    console.log('[BalanceSync] Starting background sync');

    setInterval(async () => {
      try {
        await refreshBalance();
        // Update all balance displays
        updateBalanceDisplay('available-balance');
        updateBalanceDisplay('balance');
        updateBalanceDisplay('current-balance');
      } catch (err) {
        console.warn('[BalanceSync] Sync error:', err);
      }
    }, SYNC_INTERVAL);
  }

  /**
   * Listen to socket.io events for real-time updates
   */
  function listenToSocketEvents() {
    if (typeof io === 'undefined') {
      console.warn('[BalanceSync] socket.io not available');
      return;
    }

    try {
      const socket = io();

      // Real-time balance update from server
      socket.on('balance_updated', async (data) => {
        console.log('[BalanceSync] Socket event: balance_updated', data);
        await refreshBalance();
        updateBalanceDisplay();
      });

      // Trade completed
      socket.on('trade_completed', async (data) => {
        console.log('[BalanceSync] Socket event: trade_completed', data);
        await refreshBalance();
      });

      // Simulator status change
      socket.on('simulator_status', async (data) => {
        console.log('[BalanceSync] Socket event: simulator_status', data);
        await refreshBalance();
      });

      // Admin adjustment
      socket.on('admin_adjustment', async (data) => {
        console.log('[BalanceSync] Socket event: admin_adjustment', data);
        await refreshBalance();
      });
    } catch (err) {
      console.warn('[BalanceSync] Socket setup error:', err);
    }
  }

  /**
   * Initialize balance sync
   */
  async function initialize() {
    console.log('[BalanceSync] Initializing');

    // Fetch initial balance
    await refreshBalance();
    updateBalanceDisplay();

    // Start background polling
    startSync();

    // Listen to real-time updates
    listenToSocketEvents();
  }

  /**
   * CRITICAL: Clear all stored balance data (logout)
   */
  function clearBalance() {
    currentBalance = null;
    lastSyncTime = 0;
    localStorage.removeItem('balance');
    localStorage.removeItem('availableBalance');
    localStorage.removeItem('portfolioTotal');
    console.log('[BalanceSync] Cleared balance data');
  }

  return {
    initialize,
    getBalance,
    refreshBalance,
    updateBalanceDisplay,
    clearBalance,
    startSync,
    listenToSocketEvents,
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
      BalanceSync.initialize().catch(e => console.warn('[BalanceSync] Init error:', e));
    }
  });
} else {
  // DOM already loaded
  if (typeof AuthService !== 'undefined' && AuthService.isAuthenticated()) {
    BalanceSync.initialize().catch(e => console.warn('[BalanceSync] Init error:', e));
  }
}
