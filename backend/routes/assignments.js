const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

module.exports = (run, get, all) => {
  router.get('/', auth, async (req, res) => {
    try {
      let query = `SELECT a.*, ast.name as asset_name, u.username as assigned_by_name
        FROM assignments a JOIN assets ast ON a.asset_id = ast.id JOIN users u ON a.assigned_by = u.id WHERE 1=1`;
      const params = [];
      if (req.user.role !== 'admin') {
        query += ' AND a.base = ?';
        params.push(req.user.base);
      }
      query += ' ORDER BY a.created_at DESC';
      res.json(await all(query, params));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', auth, async (req, res) => {
    try {
      const { asset_id, quantity, base, assigned_to, type, notes } = req.body;
      if (!asset_id || !quantity || !base || !assigned_to || !type)
        return res.status(400).json({ error: 'Missing fields' });
      const targetBase = req.user.role !== 'admin' ? req.user.base : base;
      const asset = await get('SELECT * FROM assets WHERE id = ? AND base = ?', [asset_id, targetBase]);
      if (!asset || asset.quantity < quantity)
        return res.status(400).json({ error: 'Insufficient quantity' });
      await run(
        'INSERT INTO assignments (asset_id,quantity,base,assigned_to,assigned_by,type,notes) VALUES (?,?,?,?,?,?,?)',
        [asset_id, quantity, targetBase, assigned_to, req.user.id, type, notes]
      );
      await run(
        'UPDATE assets SET quantity = quantity - ? WHERE id = ? AND base = ?',
        [quantity, asset_id, targetBase]
      );
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};