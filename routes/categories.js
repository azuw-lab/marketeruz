const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const auth = require('../middleware/auth');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { section } = req.query;
    let sql = 'SELECT * FROM categories';
    const params = [];
    if (section) {
      sql += ' WHERE section = $1';
      params.push(section);
    }
    sql += ' ORDER BY section, name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/', auth, async (req, res) => {
  try {
    const { name, slug, section } = req.body;
    if (!name || !slug || !section) {
      return res.status(400).json({ error: 'Name, slug, and section are required' });
    }
    const { rows } = await query(
      'INSERT INTO categories (name, slug, section) VALUES ($1,$2,$3) RETURNING *',
      [name, slug, section]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505' || (err.message && err.message.includes('UNIQUE'))) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    await query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
