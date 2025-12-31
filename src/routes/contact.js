const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: 'Missing fields' });
  try {
    await db.query('INSERT INTO contacts(name,email,message,created_at) VALUES($1,$2,$3,NOW())', [name || null, email, message]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
