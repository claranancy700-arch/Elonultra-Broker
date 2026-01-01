const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

// POST contact message (optionally protected with token if you want authenticated users only)
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  // Validate input
  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    await db.query(
      'INSERT INTO contacts(name,email,message,created_at) VALUES($1,$2,$3,NOW())',
      [name || null, email, message]
    );
    res.status(201).json({ success: true, message: 'Contact message received' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
});

module.exports = router;
