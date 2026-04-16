const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (run, get, all) => {
  router.get('/', auth, async (req, res) => {
    try {
      let query = `SELECT p.*, a.name as asset_name, a.category, u.username as purchased_by_name
        FROM purchases p JOIN assets a ON p.asset_id = a.id JOIN users u ON p.purchased_by = u.id WHERE 1=1`;
      const params = [];
      if (req.user.role !== 'admin') {
        query += ' AND p.base = ?';
        params.push(req.user.base);
      }
      query += ' ORDER BY p.created_at DESC';
      res.json(await all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', auth, requireRole('admin', 'logistics_officer'), async (req, res) => {
    try {
      const { asset_id, quantity, base, notes } = req.body;
      if (!asset_id || !quantity || !base)
        return res.status(400).json({ error: 'Missing fields' });
      const targetBase = req.user.role !== 'admin' ? req.user.base : base;
      await run(
        'INSERT INTO purchases (asset_id,quantity,base,purchased_by,notes) VALUES (?,?,?,?,?)',
        [asset_id, quantity, targetBase, req.user.id, notes]
      );
      await run(
        'UPDATE assets SET quantity = quantity + ? WHERE id = ? AND base = ?',
        [quantity, asset_id, targetBase]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};