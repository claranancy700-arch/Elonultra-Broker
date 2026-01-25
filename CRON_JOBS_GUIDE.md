# Cron Jobs / Node Scheduler - Quick Guide

## Your Current Setup

Your app **already has background jobs running**! They start automatically when the server starts.

### Jobs Currently Running

| Job | File | Schedule | Purpose |
|-----|------|----------|---------|
| **Price Updater** | `src/jobs/priceUpdater.js` | Every 24 hours | Update crypto prices |
| **Testimonies Generator** | `src/jobs/testimoniesGenerator.js` | Every 24 hours | Auto-generate fake testimonies |
| **Trade Simulator** | `src/jobs/tradeSimulator.js` | Hourly (Mon-Fri only) | Simulate user trades |

## Where Jobs Are Started

File: **`src/server.js`** (lines 65-72)

```javascript
// start daily job (24h)
const { startPriceUpdater } = require('./jobs/priceUpdater');
const { startTradeSimulator } = require('./jobs/tradeSimulator');
const { startTestimoniesGenerator } = require('./jobs/testimoniesGenerator');

startPriceUpdater({ intervalMs: 24 * 60 * 60 * 1000 });        // Every 24 hours
startTestimoniesGenerator({ intervalMs: 24 * 60 * 60 * 1000 }); // Every 24 hours
startTradeSimulator();                                            // Hourly (M-F)
```

## How to Modify Schedules

### Example 1: Change Testimonies Generator to Every 12 Hours

**File:** `src/server.js` (line 71)

```javascript
// BEFORE: Every 24 hours
startTestimoniesGenerator({ intervalMs: 24 * 60 * 60 * 1000 });

// AFTER: Every 12 hours
startTestimoniesGenerator({ intervalMs: 12 * 60 * 60 * 1000 });
```

### Example 2: Create a New Cron Job

**Step 1:** Create job file at `src/jobs/myNewJob.js`

```javascript
const db = require('../db');

function startMyJob(options = {}) {
  const intervalMs = options.intervalMs || 60 * 60 * 1000; // Default: 1 hour

  // Run immediately on start
  runMyJob();

  // Then run every interval
  setInterval(() => {
    runMyJob();
  }, intervalMs);

  console.log(`[My Job] Started with interval: ${intervalMs / 1000 / 60} minutes`);
}

async function runMyJob() {
  try {
    console.log('[My Job] Running...');
    
    // Do your work here
    // Example: Update something in database
    await db.query('UPDATE users SET updated_at = NOW()');
    
    console.log('[My Job] Completed successfully');
  } catch (err) {
    console.error('[My Job] Error:', err.message);
  }
}

module.exports = { startMyJob };
```

**Step 2:** Add to `src/server.js` (after line 72)

```javascript
const { startMyJob } = require('./jobs/myNewJob');
startMyJob({ intervalMs: 60 * 60 * 1000 }); // Every 1 hour
```

**Step 3:** Restart server
```bash
npm run server:dev
```

## Time Conversion Cheat Sheet

```javascript
// Minutes
1 * 60 * 1000                  // 1 minute
5 * 60 * 1000                  // 5 minutes
10 * 60 * 1000                 // 10 minutes

// Hours
1 * 60 * 60 * 1000             // 1 hour
2 * 60 * 60 * 1000             // 2 hours
6 * 60 * 60 * 1000             // 6 hours
12 * 60 * 60 * 1000            // 12 hours

// Days
1 * 24 * 60 * 60 * 1000        // 1 day (24 hours)
7 * 24 * 60 * 60 * 1000        // 1 week
```

## View Existing Jobs

### 1. Price Updater Job

**File:** `src/jobs/priceUpdater.js`
- Updates cryptocurrency prices
- Runs: Every 24 hours
- Updates table: `prices`

### 2. Testimonies Generator Job

**File:** `src/jobs/testimoniesGenerator.js`
- Auto-generates fake customer testimonies
- Runs: Every 24 hours
- Updates table: `testimonies`

### 3. Trade Simulator Job

**File:** `src/jobs/tradeSimulator.js`
- Simulates crypto trades for active users
- Runs: Every hour (Monday-Friday only)
- Updates tables: `trades`, `users` (portfolio value)

## Check Job Logs

When server starts, you'll see:
```
[Price Updater] Started with interval: 1440 minutes
[Testimonies Auto-Generate] Started with interval: 1440 minutes
[Trade Simulator] Started with interval: 60 minutes (Mon-Fri only)
```

Check the terminal output to see when jobs run.

## Common Schedule Patterns

### Daily at specific time (Advanced)

For more control, use `node-schedule` package directly:

```javascript
const schedule = require('node-schedule');

// Run every day at 2:00 AM
const job = schedule.scheduleJob('0 2 * * *', async () => {
  console.log('Running at 2:00 AM');
  // Your code here
});
```

**Cron Format:** `minute hour day month weekday`
- `0 2 * * *` = 2:00 AM every day
- `0 9 * * 1-5` = 9:00 AM Monday-Friday
- `30 * * * *` = Every hour at :30

### Only Business Hours (Mon-Fri, 9-5)

```javascript
const schedule = require('node-schedule');

// Run every hour Mon-Fri, 9 AM - 5 PM
const rule = new schedule.RecurrenceRule();
rule.hour = [9, 10, 11, 12, 13, 14, 15, 16, 17];
rule.dayOfWeek = [1, 2, 3, 4, 5];

schedule.scheduleJob(rule, async () => {
  console.log('Running during business hours');
  // Your code here
});
```

## Disable a Job

Comment out or remove the start call in `src/server.js`:

```javascript
// DISABLED: Auto-generate testimonies
// startTestimoniesGenerator({ intervalMs: 24 * 60 * 60 * 1000 });
```

## Testing a Job Manually

Run via API endpoint instead of waiting for scheduler:

```bash
# Trigger testimonies generation manually
curl -X POST http://localhost:5001/api/testimonies-generate/generate-batch \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{"count": 5}'
```

## Monitor Job Health

Add logging to your job file to track success/failures:

```javascript
async function runMyJob() {
  const startTime = Date.now();
  
  try {
    console.log(`[My Job] Starting at ${new Date().toISOString()}`);
    
    // Do work
    await db.query('...');
    
    const duration = Date.now() - startTime;
    console.log(`[My Job] Completed in ${duration}ms`);
  } catch (err) {
    console.error(`[My Job] FAILED:`, err.message);
    // Optionally send alert/email here
  }
}
```

## Production Best Practices

1. **Set appropriate intervals** - Don't run jobs too frequently
2. **Add error handling** - Catch and log errors
3. **Use database transactions** - Avoid partial updates
4. **Monitor logs** - Check job execution in production
5. **Consider load** - Heavy jobs shouldn't run during peak hours
6. **Add job locks** - Prevent concurrent execution (if needed)

## Common Issues

### Job runs multiple times

**Cause:** Job started multiple times (maybe restarting)  
**Fix:** Check if job is already running before starting new instance

### Job never runs

**Cause:** Error during initialization  
**Fix:** Check server logs for error messages

### Job runs too slowly

**Cause:** Database or external API is slow  
**Fix:** Add timeout and async operations

---

## Quick Reference

| Task | Location |
|------|----------|
| Start jobs | `src/server.js` line 65-72 |
| View jobs | `src/jobs/` folder |
| Change schedule | Edit `intervalMs` in `src/server.js` |
| Create new job | Create file in `src/jobs/` and import in `src/server.js` |
| Trigger manually | Use API endpoints like `/api/testimonies-generate` |

---

Your app is **ready to go**! Jobs run automatically when server starts. 🚀
