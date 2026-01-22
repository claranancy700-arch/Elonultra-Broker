const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET all testimonies (public)
router.get('/', async (req, res) => {
  try {
    const query = req.query.featured === 'true' 
      ? 'SELECT * FROM testimonies WHERE is_featured = true ORDER BY created_at DESC'
      : 'SELECT * FROM testimonies ORDER BY created_at DESC';
    
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Testimonies fetch error:', err);
    
    // Return mock testimonies if database fails
    const mockTestimonies = [
      {
        id: 1,
        client_name: 'John Smith',
        title: 'Verified Client',
        content: 'The trading service has been honest, transparent, and consistently efficient. Their support agents guided me clearly through every step and I always knew what was happening with my account.',
        rating: 5,
        is_featured: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        client_name: 'Sarah Johnson',
        title: 'Satisfied Investor',
        content: 'I was skeptical at first, but the results and the communication have been clear and professional. The service agents are responsive and the trading updates are consistent.',
        rating: 5,
        is_featured: true,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        client_name: 'Michael Chen',
        title: 'Long-term Client',
        content: 'What I value most is the transparency. The trading history is easy to understand, and the support team explains everything without pressure. Very reliable service.',
        rating: 5,
        is_featured: true,
        created_at: new Date().toISOString()
      }
    ];
    
    res.json(mockTestimonies);
  }
});

// GET single testimony by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM testimonies WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Testimony not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Testimony fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch testimony' });
  }
});

// POST new testimony (admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const { client_name, client_image, title, rating, content, is_featured } = req.body;

    if (!client_name || !content) {
      return res.status(400).json({ error: 'client_name and content are required' });
    }

    const result = await db.query(
      `INSERT INTO testimonies (client_name, client_image, title, rating, content, is_featured)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [client_name, client_image || null, title || '', rating || 5, content, is_featured || false]
    );

    console.log(`[Testimonies] New testimony added by admin: "${client_name}"`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Testimony creation error:', err);
    res.status(500).json({ error: 'Failed to create testimony' });
  }
});

// PUT update testimony (admin only)
router.put('/:id', verifyAdmin, async (req, res) => {
  try {
    const { client_name, client_image, title, rating, content, is_featured } = req.body;

    const result = await db.query(
      `UPDATE testimonies 
       SET client_name = COALESCE($1, client_name),
           client_image = COALESCE($2, client_image),
           title = COALESCE($3, title),
           rating = COALESCE($4, rating),
           content = COALESCE($5, content),
           is_featured = COALESCE($6, is_featured),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [client_name, client_image, title, rating, content, is_featured, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Testimony not found' });
    }

    console.log(`[Testimonies] Testimony ${req.params.id} updated by admin`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Testimony update error:', err);
    res.status(500).json({ error: 'Failed to update testimony' });
  }
});

// DELETE testimony (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM testimonies WHERE id = $1 RETURNING id', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Testimony not found' });
    }

    console.log(`[Testimonies] Testimony ${req.params.id} deleted by admin`);
    res.json({ success: true, deleted_id: result.rows[0].id });
  } catch (err) {
    console.error('Testimony deletion error:', err);
    res.status(500).json({ error: 'Failed to delete testimony' });
  }
});

module.exports = router;
