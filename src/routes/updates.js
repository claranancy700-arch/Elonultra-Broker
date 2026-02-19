const express = require('express');
const router = express.Router();
const sse = require('../sse/broadcaster');

// SSE subscribe: clients connect with ?userId=123
router.get('/stream', (req, res) => {
  // Support optional userId; default to 'global' so clients can subscribe to global events
  const userId = req.query.userId || 'global';
  // Subscribe the response for SSE
  sse.subscribe(userId, res);
});

module.exports = router;
