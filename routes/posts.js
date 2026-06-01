const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const auth = require('../middleware/auth');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeSlug(title) {
  const base = slugify(title) || 'post';
  return `${base}-${Date.now()}`;
}

// GET /api/posts — public by default (published only), admin can see all
router.get('/', async (req, res) => {
  try {
    const { section } = req.query;

    // Optional auth: if Bearer token present, treat as admin
    let isAdmin = false;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        isAdmin = true;
      } catch {}
    }

    let sql = 'SELECT * FROM posts WHERE 1=1';
    const params = [];
    let i = 1;

    if (!isAdmin) {
      sql += ' AND published = 1';
    }

    if (section) {
      sql += ` AND section = $${i++}`;
      params.push(section);
    }

    sql += ' ORDER BY date DESC NULLS LAST, created_at DESC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts — admin only
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, body, section, category, role, tags, image, date, published } = req.body;
    if (!title || !section) {
      return res.status(400).json({ error: 'Title and section are required' });
    }
    const slug = makeSlug(title);
    const { rows } = await query(
      `INSERT INTO posts (title, slug, description, body, section, category, role, tags, image, date, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        title,
        slug,
        description || null,
        body || null,
        section,
        category || null,
        role || null,
        tags || null,
        image || null,
        date || null,
        published !== undefined ? (published ? 1 : 0) : 1,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505' || (err.message && err.message.includes('UNIQUE'))) {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/posts/:id — admin only
router.put('/:id', auth, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Post not found' });
    const post = existing[0];

    const { title, description, body, section, category, role, tags, image, date, published } = req.body;

    const { rows } = await query(
      `UPDATE posts SET
        title = $1, description = $2, body = $3, section = $4, category = $5,
        role = $6, tags = $7, image = $8, date = $9, published = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [
        title !== undefined ? title : post.title,
        description !== undefined ? description : post.description,
        body !== undefined ? body : post.body,
        section !== undefined ? section : post.section,
        category !== undefined ? category : post.category,
        role !== undefined ? role : post.role,
        tags !== undefined ? tags : post.tags,
        image !== undefined ? image : post.image,
        date !== undefined ? date : post.date,
        published !== undefined ? (published ? 1 : 0) : post.published,
        req.params.id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id — admin only
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
