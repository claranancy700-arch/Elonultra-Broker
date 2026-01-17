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

// Run DB init (create audit/columns) and start background jobs - MUST RUN BEFORE ROUTES
// THIS MUST COMPLETE BEFORE SERVER STARTS LISTENING
(async () => {
  try {
    const { ensureSchema } = require('./db/init');
    await ensureSchema();
    console.log('Database schema initialized');
    
    // NOW register routes after DB is ready
    const authRoutes = require('./routes/auth');
    const contactRoutes = require('./routes/contact');
    const withdrawalRoutes = require('./routes/withdrawals');
    const depositRoutes = require('./routes/deposit');
    const transactionsRoutes = require('./routes/transactions');
    const adminRoutes = require('./routes/admin');
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
    app.use('/api/updates', updatesRoutes);
    app.use('/api/prices', pricesRoutes);
    app.use('/api/trades', tradesRoutes);
    app.use('/api/testimonies', testimoniesRoutes);
    app.use('/api/testimonies-generate', testimoniesGenerateRoutes);
    app.use('/api/prompts', promptsRoutes);
    
    console.log('All routes loaded successfully after DB init');
    
    // start daily job (24h)
    const { startPriceUpdater } = require('./jobs/priceUpdater');
    const { startTradeSimulator } = require('./jobs/tradeSimulator');
    startPriceUpdater({ intervalMs: 24 * 60 * 60 * 1000 });
    // start hourly trade simulator (Monday-Friday)
    startTradeSimulator();
    console.log('Background jobs started');
    
    // NOW START THE SERVER - after everything is initialized
    const server = app.listen(port, () => {
      console.log(`✓ Server listening on port ${port} with all routes and DB ready`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, closing server...');
      server.close();
    });
  } catch (err) {
    console.error('Critical error during initialization:', err.message || err);
    console.error('Server may not function properly - routes/DB not initialized');
    process.exit(1);
  }
})();

// Simple health endpoint (no DB dependency)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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

module.exports = app;
