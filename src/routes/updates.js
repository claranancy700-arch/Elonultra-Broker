const express = require('express');
const router = express.Router();
const sse = require('../sse/broadcaster');

// SSE subscribe: clients connect with ?userId=123
router.get('/stream', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required as query param' });
  // Subscribe the response for SSE
  sse.subscribe(userId, res);
});

module.exports = router;
