const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (db) => {
  router.get('/', auth, (req, res) => {
    let query = `SELECT t.*, a.name as asset_name, u.username as transferred_by_name
      FROM transfers t JOIN assets a ON t.asset_id = a.id JOIN users u ON t.transferred_by = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { query += ' AND (t.from_base = ? OR t.to_base = ?)'; params.push(req.user.base, req.user.base); }
    query += ' ORDER BY t.created_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  router.post('/', auth, requireRole('admin', 'base_commander'), (req, res) => {
    const { asset_id, quantity, from_base, to_base, notes } = req.body;
    if (!asset_id || !quantity || !from_base || !to_base) return res.status(400).json({ error: 'Missing fields' });
    const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND base = ?').get(asset_id, from_base);
    if (!asset || asset.quantity < quantity) return res.status(400).json({ error: 'Insufficient quantity' });
    db.prepare('INSERT INTO transfers (asset_id, quantity, from_base, to_base, transferred_by, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(asset_id, quantity, from_base, to_base, req.user.id, notes, 'approved');
    db.prepare('UPDATE assets SET quantity = quantity - ? WHERE id = ? AND base = ?').run(quantity, asset_id, from_base);
    const dest = db.prepare('SELECT * FROM assets WHERE name = ? AND base = ?').get(asset.name, to_base);
    if (dest) db.prepare('UPDATE assets SET quantity = quantity + ? WHERE id = ?').run(quantity, dest.id);
    else db.prepare('INSERT INTO assets (name, category, base, quantity) VALUES (?, ?, ?, ?)').run(asset.name, asset.category, to_base, quantity);
    res.json({ success: true });
  });

  return router;
};