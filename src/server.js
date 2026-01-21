const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Simple health endpoint (no DB dependency) - register FIRST so it's always available
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Run DB init and route registration - THEN start server
(async () => {
  try {
    const { ensureSchema } = require('./db/init');
    await ensureSchema();
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Database init error:', err.message || err);
    console.error('Server will continue, but DB-dependent features may fail');
  }

  try {
    // Register routes after DB init attempt
    const authRoutes = require('./routes/auth');
    const contactRoutes = require('./routes/contact');
    const withdrawalRoutes = require('./routes/withdrawals');
    const depositRoutes = require('./routes/deposit');
    const transactionsRoutes = require('./routes/transactions');
    const adminRoutes = require('./routes/admin');
    const configRoutes = require('./routes/config');
    const updatesRoutes = require('./routes/updates');
    const pricesRoutes = require('./routes/prices');
    const tradesRoutes = require('./routes/trades');
    const testimoniesRoutes = require('./routes/testimonies');
    const testimoniesGenerateRoutes = require('./routes/testimonies-generate');
    const promptsRoutes = require('./routes/prompts');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/withdrawals', withdrawalRoutes);
    app.use('/api/deposit', depositRoutes);
    app.use('/api/transactions', transactionsRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/admin/config', configRoutes);
    app.use('/api/updates', updatesRoutes);
    app.use('/api/prices', pricesRoutes);
    app.use('/api/trades', tradesRoutes);
    app.use('/api/testimonies', testimoniesRoutes);
    app.use('/api/testimonies-generate', testimoniesGenerateRoutes);
    app.use('/api/prompts', promptsRoutes);
    
    console.log('All routes loaded successfully');
  } catch (err) {
    console.error('Route registration error:', err.message || err);
  }

  try {
    // start daily job (24h)
    const { startPriceUpdater } = require('./jobs/priceUpdater');
    const { startTradeSimulator } = require('./jobs/tradeSimulator');
    startPriceUpdater({ intervalMs: 24 * 60 * 60 * 1000 });
    // start hourly trade simulator (Monday-Friday)
    startTradeSimulator();
    console.log('Background jobs started');
  } catch (err) {
    console.error('Background jobs error:', err.message || err);
  }

  // Serve frontend static files from project root (so /markets or /markets.html work)
  // MUST BE AFTER API ROUTES so /api/* endpoints take priority
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
    console.log('[CATCH-ALL] Request to:', req.path, '| Will check if API...');
    const reqPath = req.path.replace(/^\//, '');
    // Do not interfere with API routes
    if (req.path.startsWith('/api/')) {
      console.log('[CATCH-ALL] Blocking API route - returning 404 JSON');
      return res.status(404).json({ error: 'API route not found' });
    }

    console.log('[CATCH-ALL] Serving frontend for path:', reqPath);
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

  // Apply centralized error handler middleware (MUST be last middleware)
  app.use(errorHandler);

  // START THE SERVER - after routes are registered
  const server = app.listen(port, () => {
    console.log(`✓ Server listening on port ${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close();
  });
})();

module.exports = app;
