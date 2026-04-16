const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (db) => {
  router.get('/', auth, (req, res) => {
    let query = `SELECT a.*, ast.name as asset_name, u.username as assigned_by_name
      FROM assignments a JOIN assets ast ON a.asset_id = ast.id JOIN users u ON a.assigned_by = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { query += ' AND a.base = ?'; params.push(req.user.base); }
    query += ' ORDER BY a.created_at DESC';
    res.json(db.prepare(query).all(...params));
  });

  router.post('/', auth, requireRole('admin', 'base_commander', 'logistics_officer'), (req, res) => {
    const { asset_id, quantity, base, assigned_to, type, notes } = req.body;
    if (!asset_id || !quantity || !base || !assigned_to || !type) return res.status(400).json({ error: 'Missing fields' });
    const targetBase = req.user.role !== 'admin' ? req.user.base : base;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ? AND base = ?').get(asset_id, targetBase);
    if (!asset || asset.quantity < quantity) return res.status(400).json({ error: 'Insufficient quantity' });
    db.prepare('INSERT INTO assignments (asset_id, quantity, base, assigned_to, assigned_by, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)').run(asset_id, quantity, targetBase, assigned_to, req.user.id, type, notes);
    db.prepare('UPDATE assets SET quantity = quantity - ? WHERE id = ? AND base = ?').run(quantity, asset_id, targetBase);
    res.json({ success: true });
  });

  return router;
};