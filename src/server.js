const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Simple health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes (will create basic handlers) — wrapped in try-catch for safety
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/contact', require('./routes/contact'));
  app.use('/api/withdrawals', require('./routes/withdrawals'));
} catch (err) {
  console.error('Warning: Failed to load routes:', err.message);
  console.log('Health endpoint available but auth/contact/withdrawals routes may fail');
}

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close();
});

module.exports = app;
