# Serverless Hosting Migration Guide

## Current Status
Your app is currently hosted on **Render.com** (traditional containerized hosting), which is working well. This document outlines serverless options and migration requirements.

---

## Can Your App Use Serverless?

### ✅ Yes, but with modifications for:
1. **Database Connection Pooling** - Connection pools don't persist between function invocations
2. **Background Jobs** - 24-hour scheduled tasks need managed services
3. **Stateless Functions** - Each request gets a new instance

---

## Serverless Hosting Options

### 🥇 **Vercel (Recommended for your app)**
**Best for:** Full-stack apps with Next.js or Express functions

#### Pros:
- Native PostgreSQL support via Vercel Postgres
- Automatic deployment from Git
- Edge Functions for ultra-low latency
- Built-in caching and optimization
- Free tier available

#### Cons:
- Function timeout: 60s (standard) to 900s (Pro plan)
- Cold starts: 3-10s first request
- Functions limited to 3GB memory

#### Setup for your app:
```bash
# Convert to Vercel functions
npm install -g vercel
vercel --prod
```

**Cost:** $20/month (Pro) for production-grade

---

### 🥈 **AWS Lambda + RDS**
**Best for:** High-traffic, complex apps

#### Pros:
- Pay only for execution time (~$0.20 per 1M requests)
- Massive scalability
- RDS Proxy handles connection pooling
- EventBridge for scheduled jobs

#### Cons:
- More complex setup
- Cold starts: 5-15s
- Requires infrastructure knowledge

#### Setup:
```bash
# Use AWS Amplify for simplified deployment
amplify init
amplify add api
amplify push
```

**Cost:** ~$5-50/month depending on traffic

---

### 🥉 **Netlify Functions**
**Best for:** JAMstack and simple APIs

#### Pros:
- Easy integration with Netlify hosting
- Auto-scaling
- Generous free tier

#### Cons:
- Function timeout: 26 seconds (free)
- Limited to small payloads
- Not ideal for database-heavy ops

#### Setup:
```bash
npm install -g netlify-cli
netlify deploy
```

**Cost:** Free tier or $19/month Pro

---

## What Needs to Change

### 1. **Database Connection Pooling** (Critical)

#### Current Issue:
```javascript
// ❌ Current: Creates new connection per request
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

#### Solution Options:

**Option A: PgBouncer (Recommended)**
- Proxy layer that pools connections
- Compatible with PostgreSQL
- Minimal code changes

```javascript
// ✅ Use PgBouncer connection string instead
const pool = new Pool({
  connectionString: process.env.PGBOUNCER_URL,
  // PgBouncer handles pooling automatically
});
```

**Option B: Neon PostgreSQL**
- Serverless PostgreSQL with built-in pooling
- Perfect for serverless functions
- Free tier: 10GB storage, 10K compute hours

```javascript
// ✅ Just use Neon's connection string
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
});
```

**Option C: AWS RDS Proxy**
```javascript
const pool = new Pool({
  connectionString: process.env.RDS_PROXY_ENDPOINT,
  max: 10, // Proxy handles overflow
});
```

---

### 2. **Background Jobs** (Critical)

#### Current Issue:
```javascript
// ❌ Current: Node.js scheduler won't work in serverless
const schedule = require('node-schedule');
schedule.scheduleJob('0 0 * * *', async () => {
  // Won't run between function invocations!
});
```

#### Solutions:

**Option A: AWS EventBridge**
```javascript
// Deploy this as Lambda function
exports.handler = async (event) => {
  await generateTestimonies(3);
  return { statusCode: 200, body: 'Done' };
};
```
Then create EventBridge rule to invoke every 24 hours.

**Option B: Vercel Cron Jobs**
```javascript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/generate-testimonies",
    "schedule": "0 0 * * *"
  }]
}
```

**Option C: External Cron Service**
- Use cron-job.org (free)
- Or IFTTT to trigger your `/api/testimonies-generate` endpoint

---

### 3. **Long-Running Operations**

#### Current Issue:
```javascript
// ❌ May timeout in serverless
for (let i = 0; i < 50; i++) {
  await db.query(...);  // 50+ queries
}
```

#### Solution:
Batch operations or use message queues (AWS SQS)

```javascript
// ✅ Batch generation with shorter timeout
async function generateBatch(count) {
  const batchSize = 5;
  for (let i = 0; i < count; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize; j++) {
      batch.push(generateTestimony());
    }
    await Promise.all(
      batch.map(t => db.query('INSERT INTO testimonies...', [t]))
    );
  }
}
```

---

## Step-by-Step Migration Plan

### Phase 1: Preparation (Before Deployment)
- [ ] Switch to Neon PostgreSQL or set up PgBouncer
- [ ] Convert background jobs to managed service
- [ ] Test locally with serverless framework

### Phase 2: Deployment
- [ ] Deploy to chosen platform (Vercel/Lambda/Netlify)
- [ ] Update DNS to point to new host
- [ ] Test all endpoints

### Phase 3: Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor cold starts
- [ ] Track database query performance

---

## Performance Comparison

| Platform | Cold Start | Pricing | Best For |
|----------|-----------|---------|----------|
| Render (Current) | <100ms | $12+/month | Always-on apps |
| Vercel | 3-10s | Free-$20/mo | Modern web apps |
| AWS Lambda | 5-15s | Pay-as-you-go | Enterprise |
| Netlify | 2-8s | Free-$19/mo | Static + functions |

---

## My Recommendation for Your App

**Keep Render for now.** Serverless would require significant refactoring for:
- Background job management
- Database connection pooling
- Cold start overhead

**Migrate to serverless only if you need:**
- Massive autoscaling (>1000 concurrent users)
- Pay-per-execution pricing for bursty traffic
- Global edge distribution (Vercel)

**If you do migrate, use: Vercel + Neon PostgreSQL**
- Simplest setup
- Best DX (developer experience)
- Handles 99% of your needs
- Cost: ~$20/month

---

## Performance Optimizations (Current Setup)

I've added testimonies caching to your current setup:

```javascript
// 5-minute cache for faster loads
const CACHE_TTL = 5 * 60 * 1000;

// Automatic cache invalidation on updates
testimonyCache = null;  // When POST/PUT/DELETE
```

This should make `check-testimonies` fast on local dev now.

---

## Database Connection Pool Optimization

Enhanced your PostgreSQL connection pool:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  statement_timeout: 30000,   // Query timeout
  connectionTimeoutMillis: 5000
});
```

This provides:
- Better resource management
- Automatic timeout on slow queries
- Faster connection acquisition

---

## Testing Your Changes

```bash
# Test local performance
npm run server:dev

# Check testimonies performance
node check-testimonies.js

# Run load test
npm install -g artillery
artillery quick --count 100 --num 10 http://localhost:5001/api/testimonies
```

---

## Next Steps

1. **Immediate:** Your app is now optimized with caching and better pooling
2. **Short-term:** Monitor performance in production
3. **Long-term:** Consider Vercel migration if you need advanced features

Questions? Check [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for current hosting details.
