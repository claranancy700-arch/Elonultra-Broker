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

// Disable caching for static files to ensure fresh CSS/JS on updates
app.use((req, res, next) => {
  if (req.path.includes('/css/') || req.path.includes('/js/')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

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
    const { startTestimoniesGenerator } = require('./jobs/testimoniesGenerator');
    startPriceUpdater({ intervalMs: 24 * 60 * 60 * 1000 });
    startTestimoniesGenerator({ intervalMs: 24 * 60 * 60 * 1000 });
    // start hourly trade simulator (Monday-Friday)
    startTradeSimulator();
    console.log('Background jobs started');
  } catch (err) {
    console.error('Background jobs error:', err.message || err);
  }

  // Serve React frontend static files from frontend/dist (production build)
  const frontendDist = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    console.log('📦 Serving React SPA from frontend/dist');
    app.use(express.static(frontendDist));
  }

  // Always serve static assets (js, css, images) from root for legacy HTML files
  // These won't conflict with React SPA routes since they're in specific directories
  const webRoot = path.join(__dirname, '..');
  app.use('/js', express.static(path.join(webRoot, 'js')));
  app.use('/css', express.static(path.join(webRoot, 'css')));
  app.use('/images', express.static(path.join(webRoot, 'images')));

  // Serve old HTML files from project root for backwards compatibility
  // Only register legacy static files if there is NO React build present.
  // This prevents legacy .html files (login.html, dashboard.html) from
  // shadowing the React SPA routes when frontend/dist exists.
  if (!fs.existsSync(frontendDist)) {
    app.use(express.static(webRoot));
  }

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

    // React SPA: serve React's index.html which handles routing client-side
    const reactIndex = path.join(webRoot, 'frontend/dist/index.html');
    if (fs.existsSync(reactIndex)) {
      return res.sendFile(reactIndex);
    }

    // Fallback to legacy HTML pages in root directory
    const candidate = path.join(webRoot, `${reqPath || 'index'}.html`);
    if (fs.existsSync(candidate)) return res.sendFile(candidate);

    // If path includes subpaths, try the last segment (e.g. /settings/profile -> settings.html)
    const lastSeg = reqPath.split('/').filter(Boolean).slice(-1)[0];
    if (lastSeg) {
      const fallback = path.join(webRoot, `${lastSeg}.html`);
      if (fs.existsSync(fallback)) return res.sendFile(fallback);
    }

    // Final fallback
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
