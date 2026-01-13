const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Run DB init and start background jobs
async function initializeApp() {
  try {
    const { ensureSchema } = require('./db/init');
    await ensureSchema();

    const { startPriceUpdater } = require('./jobs/priceUpdater');
    const { startUserTradeSimulator } = require('./jobs/userTradeSimulator');

    // start daily valuation job (24h)
    startPriceUpdater({ intervalMs: 24 * 60 * 60 * 1000 });

    // start per-user trade simulator (runs based on per-user schedules)
    startUserTradeSimulator();
  } catch (err) {
    console.warn('Failed to start background jobs or init:', err.message || err);
  }
}

// Serve frontend static files from project root (so /markets or /markets.html work)
const webRoot = path.join(__dirname, '..');
app.use(express.static(webRoot));

// If a request matches a top-level path like /markets, try to serve markets.html
app.get('/:page', (req, res, next) => {
  const page = req.params.page;
  // ignore API routes
  if (page === 'api' || page.startsWith('api')) return next();
  const file = path.join(webRoot, `${page}.html`);
  if (fs.existsSync(file)) return res.sendFile(file);
  next();
});

// Catch-all for nested or arbitrary frontend routes (e.g. /markets, /settings/profile)
app.get('*', (req, res, next) => {
  const reqPath = req.path.replace(/^\//, '');
  // Do not interfere with API routes
  if (req.path.startsWith('/api/')) return next();

  // Try direct file match: about.html for /about, markets.html for /markets
  const candidate = path.join(webRoot, `${reqPath || 'index'}.html`);
  if (fs.existsSync(candidate)) return res.sendFile(candidate);

  // If path includes subpaths, try the last segment (e.g. /settings/profile -> settings.html)
  const lastSeg = reqPath.split('/').filter(Boolean).slice(-1)[0];
  if (lastSeg) {
    const fallback = path.join(webRoot, `${lastSeg}.html`);
    if (fs.existsSync(fallback)) return res.sendFile(fallback);
  }

  // Fallback to index.html to let frontend handle routing, or send 404
  const indexFile = path.join(webRoot, 'index.html');
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);

  res.status(404).send('Not Found');
});

// Simple health endpoint (no DB dependency)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes (loaded with error handling)
try {
  const authRoutes = require('./routes/auth');
  const contactRoutes = require('./routes/contact');
  const withdrawalRoutes = require('./routes/withdrawals');
  const depositRoutes = require('./routes/deposit');
  const transactionsRoutes = require('./routes/transactions');
  const adminRoutes = require('./routes/admin');
  const updatesRoutes = require('./routes/updates');
  const pricesRoutes = require('./routes/prices');
  const testimoniesRoutes = require('./routes/testimonies');
  const testimoniesGenerateRoutes = require('./routes/testimonies-generate');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/withdrawals', withdrawalRoutes);
  app.use('/api/deposit', depositRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/updates', updatesRoutes);
  app.use('/api/prices', pricesRoutes);
  app.use('/api/testimonies', testimoniesRoutes);
  app.use('/api/testimonies-generate', testimoniesGenerateRoutes);
  
  console.log('Routes loaded successfully');
} catch (err) {
  console.error('Warning: Failed to load routes:', err.message);
  console.log('Health endpoint available at /api/health, other routes may fail if DB is offline');
}

// Initialize (schema + jobs) then start server
initializeApp().then(() => {
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close();
  });
});


module.exports = app;
