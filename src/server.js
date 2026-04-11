// Suppress deprecated util._extend warning (used by pg library internally)
const originalEmit = process.emit;
process.emit = function(event, err, ...args) {
  if (event === 'warning' && err?.code === 'DEP0060') {
    return;
  }
  return originalEmit.apply(process, [event, err, ...args]);
};

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5001",
      "http://127.0.0.1:5001"
    ],
    methods: ["GET", "POST"]
  }
});
const port = Number(process.env.PORT) || 5001;

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

// Startup guard: return 503 for all /api routes until route registration completes
let routesReady = false;
app.use('/api', (req, res, next) => {
  if (!routesReady) {
    return res.status(503).json({ error: 'Server is starting up. Please retry in a moment.' });
  }
  next();
});

// Bind to port immediately so the proxy never gets ECONNREFUSED during startup
// Routes are registered below once DB init completes
const tryListen = (startPort, attempts = 10) => {
  const basePort = Number(startPort) || 5001;
  let p = basePort;
  const attempt = () => {
    const srv = server.listen(p, () => {
      console.log(`✓ Server listening on port ${p}`);
    });
    srv.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${p} in use, trying ${p + 1}...`);
        p += 1;
        if (p <= basePort + attempts) { setTimeout(attempt, 200); return; }
        console.error('No available ports found, exiting.');
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  };
  attempt();
};
tryListen(port, 10);

// Run DB init and route registration asynchronously after server is already listening
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
    const marketsRoutes = require('./routes/markets');
    const contactRoutes = require('./routes/contact');
    const withdrawalRoutes = require('./routes/withdrawals');
    const depositRoutes = require('./routes/deposit');
    const transactionsRoutes = require('./routes/transactions');
    const portfolioRoutes = require('./routes/portfolio');
    const adminRoutes = require('./routes/admin');
    const proAdminRoutes = require('./routes/PRO-admin');
    const configRoutes = require('./routes/config');
    const updatesRoutes = require('./routes/updates');
    const pricesRoutes = require('./routes/prices');
    const tradesRoutes = require('./routes/trades');
    const testimoniesRoutes = require('./routes/testimonies');
    const testimoniesGenerateRoutes = require('./routes/testimonies-generate');
    const promptsRoutes = require('./routes/prompts');
    const chatRoutes = require('./routes/chat');
    const adminChatRoutes = require('./routes/admin-chat');
    const usersRoutes = require('./routes/users');
    
    app.use('/api/auth', authRoutes);
    app.use('/auth', authRoutes); // backward compatibility for existing deployed requests

    app.use('/api/users', usersRoutes);
    app.use('/api/markets', marketsRoutes);
    app.use('/api/contact', contactRoutes);
    app.use('/api/withdrawals', withdrawalRoutes);
    app.use('/api/deposit', depositRoutes);
    app.use('/api/transactions', transactionsRoutes);
    app.use('/api/portfolio', portfolioRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/admin/pro', proAdminRoutes);
    app.use('/api/admin/config', configRoutes);
    app.use('/api/updates', updatesRoutes);
    app.use('/api/prices', pricesRoutes);
    app.use('/api/trades', tradesRoutes);
    app.use('/api/testimonies', testimoniesRoutes);
    app.use('/api/testimonies-generate', testimoniesGenerateRoutes);
    app.use('/api/prompts', promptsRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/admin/chat', adminChatRoutes);
    
    routesReady = true;
    console.log('All routes loaded successfully');
    
    // Make io instance available to routes
    app.set('io', io);
    
    // Socket.io chat functionality
    const chatNamespace = io.of('/chat');

    chatNamespace.use((socket, next) => {
      try {
        const { token, adminKey } = socket.handshake.auth || {};
        const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_API_KEY || 'admin-key';

        if (adminKey && adminKey === ADMIN_KEY) {
          socket.data.authRole = 'admin';
          return next();
        }

        if (token) {
          const JWT_SECRET = process.env.JWT_SECRET || 'change_this';
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded?.userId) {
            socket.data.authRole = 'user';
            socket.data.userId = decoded.userId;
            return next();
          }
        }

        return next(new Error('Unauthorized chat socket'));
      } catch (err) {
        return next(new Error('Unauthorized chat socket'));
      }
    });
    
    chatNamespace.on('connection', (socket) => {
      console.log('User connected to chat:', socket.id);
      
      // Join conversation room
      socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`User ${socket.id} joined conversation ${conversationId}`);
      });
      
      // Leave conversation room
      socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`User ${socket.id} left conversation ${conversationId}`);
      });
      
      // Handle new message
      socket.on('send_message', async (data) => {
        try {
          const { conversationId, message, senderId } = data;
          const parsedConversationId = Number(conversationId);
          const sanitizedMessage = typeof message === 'string'
            ? message.trim().replace(/[<>]/g, '').substring(0, 1000).replace(/\s+/g, ' ')
            : '';

          if (!parsedConversationId || !sanitizedMessage) {
            socket.emit('message_error', { error: 'Invalid message payload' });
            return;
          }

          const isAdmin = socket.data.authRole === 'admin';
          const normalizedSenderType = isAdmin ? 'admin' : 'user';
          const normalizedSenderId = isAdmin ? (Number(senderId) || 0) : socket.data.userId;
          
          // Insert message into database
          const db = require('./db');
          const { rows } = await db.query(`
            INSERT INTO chat_messages (conversation_id, sender_id, sender_type, message)
            VALUES ($1, $2, $3, $4)
            RETURNING *, 
              CASE 
                WHEN $3 = 'admin' THEN 'Admin'
                ELSE (SELECT name FROM users WHERE id = $2)
              END as sender_name
          `, [parsedConversationId, normalizedSenderId, normalizedSenderType, sanitizedMessage]);
          
          const newMessage = rows[0];

          await db.query(`
            UPDATE chat_conversations
            SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [parsedConversationId]);
          
          // Broadcast to conversation room
          chatNamespace.to(`conversation_${parsedConversationId}`).emit('new_message', newMessage);
          
        } catch (error) {
          console.error('Error sending message via socket:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });
      
      // Handle typing indicators
      socket.on('typing_start', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
          userId: data.userId,
          userName: data.userName,
          isTyping: true
        });
      });
      
      socket.on('typing_stop', (data) => {
        socket.to(`conversation_${data.conversationId}`).emit('user_typing', {
          userId: data.userId,
          userName: data.userName,
          isTyping: false
        });
      });
      
      socket.on('disconnect', () => {
        console.log('User disconnected from chat:', socket.id);
      });
    });
    
  } catch (err) {
    console.error('Route registration error:', err.message || err);
  }

  try {
    // start daily job (24h)
    const { startPriceUpdater } = require('./jobs/priceUpdater');
    const { startTestimoniesGenerator } = require('./jobs/testimoniesGenerator');
    startPriceUpdater({ intervalMs: 24 * 60 * 60 * 1000 });
    startTestimoniesGenerator({ intervalMs: 24 * 60 * 60 * 1000 });

    // Simulator selection - use SIMULATOR env var to choose which simulator to run.
    // Values: 'trade' | 'balance' | 'portfolio' | 'user' | 'none'
    // If SIMULATOR is not set, prefer balance simulator when BALANCE_GROWTH_ENABLED is true.
    const SIMULATOR = (process.env.SIMULATOR && process.env.SIMULATOR.toLowerCase())
      || ((process.env.BALANCE_GROWTH_ENABLED === 'true' || process.env.BALANCE_GROWTH_ENABLED === '1') ? 'balance' : 'none');

    console.log('[Server] Selected simulator:', SIMULATOR);

    try {
      if (SIMULATOR === 'trade') {
        const { startTradeSimulator } = require('./jobs/tradeSimulator');
        startTradeSimulator();
        console.log('[Server] Trade simulator started');
      } else if (SIMULATOR === 'balance') {
        const { initializeScheduler } = require('./jobs/balanceGrowthSimulator');
        initializeScheduler();
        console.log('[Server] Balance growth simulator started');
      } else if (SIMULATOR === 'portfolio') {
        const { startPortfolioSimulator } = require('./jobs/portfolioSimulator');
        startPortfolioSimulator();
        console.log('[Server] Portfolio simulator started');
      } else if (SIMULATOR === 'user') {
        const { startUserTradeSimulator } = require('./jobs/userTradeSimulator');
        startUserTradeSimulator();
        console.log('[Server] User trade simulator started');
      } else {
        console.log('[Server] No simulator started (SIMULATOR set to none or not recognized)');
      }
    } catch (err) {
      console.error('[Server] Failed to start selected simulator:', err && err.message ? err.message : err);
    }

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

  // CRITICAL: Always serve static assets from root (js, css, images) 
  // These are needed for legacy HTML files AND for frontend/public files
  // Do this BEFORE the catch-all to ensure assets load properly
  const webRoot = path.join(__dirname, '..');
  app.use('/js', express.static(path.join(webRoot, 'js'), { 
    setHeaders: (res) => res.set('Cache-Control', 'no-cache, no-store, must-revalidate') 
  }));
  app.use('/css', express.static(path.join(webRoot, 'css'), { 
    setHeaders: (res) => res.set('Cache-Control', 'no-cache, no-store, must-revalidate') 
  }));
  app.use('/images', express.static(path.join(webRoot, 'images')));

  // Serve legacy HTML files from root (backward compatibility)
  // This is ONLY if React SPA is not built
  if (!fs.existsSync(frontendDist)) {
    console.log('⚙️  No React build found - serving legacy HTML files');
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

  // Apply centralized error handler (must be after all routes)
  app.use(errorHandler);

  // (Server is already listening — bound before schema init started)

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close();
  });
})();

module.exports = app;
