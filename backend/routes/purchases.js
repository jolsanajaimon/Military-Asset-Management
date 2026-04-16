const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (db) => {
  router.get('/', auth, (req, res) => {
    let query = `SELECT p.*, a.name as asset_name, a.category, u.username as purchased_by_name
      FROM purchases p JOIN assets a ON p.asset_id = a.id JOIN users u ON p.purchased_by = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { query += ' AND p.base = ?'; params.push(req.user.base); }
    query += ' ORDER BY p.created_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  router.post('/', auth, requireRole('admin', 'logistics_officer'), (req, res) => {
    const { asset_id, quantity, base, notes } = req.body;
    if (!asset_id || !quantity || !base) return res.status(400).json({ error: 'Missing fields' });
    const targetBase = req.user.role !== 'admin' ? req.user.base : base;
    db.prepare('INSERT INTO purchases (asset_id, quantity, base, purchased_by, notes) VALUES (?, ?, ?, ?, ?)').run(asset_id, quantity, targetBase, req.user.id, notes);
    db.prepare('UPDATE assets SET quantity = quantity + ? WHERE id = ? AND base = ?').run(quantity, asset_id, targetBase);
    res.json({ success: true });
  });

  return router;
};