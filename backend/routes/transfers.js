const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../middleware/auth');

module.exports = (run, get, all) => {
  router.get('/', auth, async (req, res) => {
    try {
      let query = `SELECT t.*, a.name as asset_name, u.username as transferred_by_name
        FROM transfers t JOIN assets a ON t.asset_id = a.id JOIN users u ON t.transferred_by = u.id WHERE 1=1`;
      const params = [];
      if (req.user.role !== 'admin') {
        query += ' AND (t.from_base = ? OR t.to_base = ?)';
        params.push(req.user.base, req.user.base);
      }
      query += ' ORDER BY t.created_at DESC';
      res.json(await all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', auth, requireRole('admin', 'base_commander'), async (req, res) => {
    try {
      const { asset_id, quantity, from_base, to_base, notes } = req.body;
      if (!asset_id || !quantity || !from_base || !to_base)
        return res.status(400).json({ error: 'Missing fields' });
      const asset = await get('SELECT * FROM assets WHERE id = ? AND base = ?', [asset_id, from_base]);
      if (!asset || asset.quantity < quantity)
        return res.status(400).json({ error: 'Insufficient quantity' });
      await run(
        'INSERT INTO transfers (asset_id,quantity,from_base,to_base,transferred_by,notes,status) VALUES (?,?,?,?,?,?,?)',
        [asset_id, quantity, from_base, to_base, req.user.id, notes, 'approved']
      );
      await run(
        'UPDATE assets SET quantity = quantity - ? WHERE id = ? AND base = ?',
        [quantity, asset_id, from_base]
      );
      const dest = await get('SELECT * FROM assets WHERE name = ? AND base = ?', [asset.name, to_base]);
      if (dest) {
        await run('UPDATE assets SET quantity = quantity + ? WHERE id = ?', [quantity, dest.id]);
      } else {
        await run(
          'INSERT INTO assets (name,category,base,quantity) VALUES (?,?,?,?)',
          [asset.name, asset.category, to_base, quantity]
        );
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};