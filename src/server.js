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

// Routes (will create basic handlers)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contact', require('./routes/contact'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = app;
