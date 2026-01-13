const db = require('../db');

/**
 * Trade Cleanup Job
 * Removes simulated trades older than 48 hours to prevent DB bloat
 * 
 * Rules:
 * - Runs every 6 hours
 * - Deletes trades older than 48 hours
 * - Preserves real trades (non-simulated)
 * - Logs deletion count for monitoring
 */

const CONFIG = {
  INTERVAL_MS: 6 * 60 * 60 * 1000, // Run every 6 hours
  RETENTION_HOURS: 48, // Keep trades for 48 hours
};

/**
 * Delete old simulated trades
 */
async function cleanupOldTrades() {
  const timestamp = new Date().toISOString();
  const retentionMs = CONFIG.RETENTION_HOURS * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - retentionMs).toISOString();

  try {
    console.log(`[Trade Cleanup] Starting cleanup at ${timestamp} (retention: ${CONFIG.RETENTION_HOURS}h)`);

    // Delete simulated trades older than retention period
    const result = await db.query(
      `DELETE FROM trades 
       WHERE is_simulated = true 
       AND created_at < $1
       RETURNING id`,
      [cutoffDate]
    );

    const deletedCount = result.rows.length;
    
    if (deletedCount > 0) {
      console.log(`[Trade Cleanup] Deleted ${deletedCount} old simulated trades (older than ${cutoffDate})`);
    } else {
      console.log(`[Trade Cleanup] No trades to cleanup (all trades are recent)`);
    }

    // Get current trade count
    const countRes = await db.query(
      'SELECT COUNT(*) as total FROM trades WHERE is_simulated = true'
    );
    const totalTrades = parseInt(countRes.rows[0].total);
    console.log(`[Trade Cleanup] Current simulated trade count: ${totalTrades}`);

    return deletedCount;
  } catch (err) {
    console.error('[Trade Cleanup] Error during cleanup:', err.message);
    return 0;
  }
}

/**
 * Start the cleanup job scheduler
 */
async function startTradeCleanup() {
  console.log('[Trade Cleanup] Starting trade cleanup scheduler...');

  // Run immediately on startup
  await cleanupOldTrades();

  // Schedule periodic cleanup
  const intervalId = setInterval(async () => {
    try {
      await cleanupOldTrades();
    } catch (err) {
      console.error('[Trade Cleanup] Unhandled error in cleanup loop:', err.message);
      // Continue retrying
    }
  }, CONFIG.INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Trade Cleanup] SIGTERM received, clearing interval...');
    clearInterval(intervalId);
  });

  console.log('[Trade Cleanup] Cleanup scheduler initialized successfully');
}

module.exports = {
  startTradeCleanup,
  cleanupOldTrades,
};
