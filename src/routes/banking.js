const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ADMIN_KEY = process.env.ADMIN_API_KEY || null;
const dataDir = path.join(__dirname, '..', '..', 'data');
const dataFile = path.join(dataDir, 'banking.json');

function ensureDataFile(){
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, JSON.stringify({}), 'utf8');
  } catch (err) { console.warn('Failed to ensure banking data file', err.message || err); }
}

function readAll(){
  ensureDataFile();
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8') || '{}'); }
  catch(e){ return {}; }
}

function writeAll(obj){
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(obj, null, 2), 'utf8');
}

// POST /api/banking - save or update banking info by email
router.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const email = (body.email || '').toString().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email required' });

    const all = readAll();
    const entry = Object.assign({}, all[email] || {}, body, { email, updated_at: new Date().toISOString() });
    if (!entry.created_at) entry.created_at = new Date().toISOString();
    all[email] = entry;
    writeAll(all);
    return res.json({ success: true, entry });
  } catch (err) {
    console.error('Save banking failed', err.message || err);
    return res.status(500).json({ error: 'failed to save' });
  }
});

// GET /api/banking?email=...  - fetch single entry by email
// GET /api/banking (admin) - list all (admin key required)
router.get('/', (req, res) => {
  try {
    const qemail = (req.query.email || '').toString().toLowerCase();
    const all = readAll();
    if (qemail) {
      return res.json({ success: true, entry: all[qemail] || null });
    }

    // require admin key to list everything
    const provided = req.headers['x-admin-key'];
    if (!ADMIN_KEY) return res.status(503).json({ error: 'admin key not configured' });
    if (!provided || provided !== ADMIN_KEY) return res.status(403).json({ error: 'forbidden' });
    return res.json({ success: true, entries: all });
  } catch (err) {
    console.error('Read banking failed', err.message || err);
    return res.status(500).json({ error: 'failed to read' });
  }
});

module.exports = router;
