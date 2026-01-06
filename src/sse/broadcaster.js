const clientsByUser = new Map();

function subscribe(userId, res) {
  if (!userId) return;
  const key = String(userId);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'X-Accel-Buffering': 'no'
  });
  res.write('\n');

  const set = clientsByUser.get(key) || new Set();
  set.add(res);
  clientsByUser.set(key, set);

  console.log('SSE: subscribe user', key, 'connections=', clientsByUser.get(key).size);
  reqCleanup(res, key);
}

function reqCleanup(res, key) {
  res.on('close', () => {
    const set = clientsByUser.get(key);
    if (set) {
      set.delete(res);
      if (set.size === 0) clientsByUser.delete(key);
      console.log('SSE: client disconnected for user', key, 'remaining=', set.size);
    }
  });
}

function emit(userId, event, payload) {
  try {
    const key = String(userId);
    const set = clientsByUser.get(key);
    if (!set || set.size === 0) return;
    const data = JSON.stringify({ event, payload });
    console.log('SSE: emit', event, 'to user', key);
    for (const res of set) {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${data}\n\n`);
      } catch (e) { /* ignore per-client errors */ }
    }
  } catch (err) {
    console.warn('SSE emit error', err && err.message);
  }
}

module.exports = { subscribe, emit };
