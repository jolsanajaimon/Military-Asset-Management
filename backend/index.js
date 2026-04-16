const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = 'military_secret_key_2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const query = (sql, params) => pool.query(sql, params);

const initDB = async () => {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    base TEXT
  )`);
  await query(`CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    base TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    base TEXT NOT NULL,
    purchased_by INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    from_base TEXT NOT NULL,
    to_base TEXT NOT NULL,
    transferred_by INTEGER NOT NULL,
    status TEXT DEFAULT 'approved',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await query(`CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    base TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    assigned_by INTEGER NOT NULL,
    type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);

  const { rows } = await query('SELECT COUNT(*) as c FROM users');
  if (parseInt(rows[0].c) === 0) {
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    await query('INSERT INTO users (username,password,role,base) VALUES ($1,$2,$3,$4)',
      ['admin', hash('admin123'), 'admin', null]);
    await query('INSERT INTO users (username,password,role,base) VALUES ($1,$2,$3,$4)',
      ['commander_alpha', hash('pass123'), 'base_commander', 'Alpha Base']);
    await query('INSERT INTO users (username,password,role,base) VALUES ($1,$2,$3,$4)',
      ['commander_bravo', hash('pass123'), 'base_commander', 'Bravo Base']);
    await query('INSERT INTO users (username,password,role,base) VALUES ($1,$2,$3,$4)',
      ['logistics1', hash('pass123'), 'logistics_officer', 'Alpha Base']);

    const assets = [
      ['M1 Abrams Tank','vehicle','Alpha Base',12],
      ['Humvee','vehicle','Alpha Base',45],
      ['M4 Carbine','weapon','Alpha Base',200],
      ['Glock 17','weapon','Alpha Base',80],
      ['5.56mm Rounds','ammunition','Alpha Base',50000],
      ['9mm Rounds','ammunition','Alpha Base',20000],
      ['M1 Abrams Tank','vehicle','Bravo Base',8],
      ['Humvee','vehicle','Bravo Base',30],
      ['M4 Carbine','weapon','Bravo Base',150],
      ['5.56mm Rounds','ammunition','Bravo Base',35000],
      ['Night Vision Goggles','equipment','Alpha Base',60],
      ['Body Armor','equipment','Bravo Base',120],
    ];
    for (const a of assets) {
      await query('INSERT INTO assets (name,category,base,quantity) VALUES ($1,$2,$3,$4)', a);
    }
  }
};

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' });
  next();
};

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, base: user.base },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, base: user.base } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const f = req.user.role !== 'admin' ? `AND base = '${req.user.base}'` : '';
    const totalAssets = (await query(`SELECT SUM(quantity) as t FROM assets WHERE 1=1 ${f}`)).rows[0]?.t || 0;
    const vehicles = (await query(`SELECT SUM(quantity) as t FROM assets WHERE category='vehicle' ${f}`)).rows[0]?.t || 0;
    const weapons = (await query(`SELECT SUM(quantity) as t FROM assets WHERE category='weapon' ${f}`)).rows[0]?.t || 0;
    const ammunition = (await query(`SELECT SUM(quantity) as t FROM assets WHERE category='ammunition' ${f}`)).rows[0]?.t || 0;
    const pendingTransfers = (await query(`SELECT COUNT(*) as t FROM transfers WHERE status='pending'`)).rows[0]?.t || 0;
    const recentPurchases = (await query(`SELECT COUNT(*) as t FROM purchases WHERE created_at >= NOW() - INTERVAL '30 days'`)).rows[0]?.t || 0;
    const assetsByBase = (await query(`SELECT base, SUM(quantity) as total FROM assets WHERE 1=1 ${f} GROUP BY base`)).rows;
    const assetsByCategory = (await query(`SELECT category, SUM(quantity) as total FROM assets WHERE 1=1 ${f} GROUP BY category`)).rows;
    res.json({
      stats: { totalAssets, vehicles, weapons, ammunition, pendingTransfers, recentPurchases },
      assetsByBase,
      assetsByCategory
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/assets', auth, async (req, res) => {
  try {
    const { base, category } = req.query;
    let sql = 'SELECT * FROM assets WHERE 1=1';
    const params = [];
    let i = 1;
    if (req.user.role !== 'admin') { sql += ` AND base = $${i++}`; params.push(req.user.base); }
    else if (base) { sql += ` AND base = $${i++}`; params.push(base); }
    if (category) { sql += ` AND category = $${i++}`; params.push(category); }
    res.json((await query(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/purchases', auth, async (req, res) => {
  try {
    let sql = `SELECT p.*, a.name as asset_name, a.category, u.username as purchased_by_name
      FROM purchases p JOIN assets a ON p.asset_id = a.id JOIN users u ON p.purchased_by = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { sql += ' AND p.base = $1'; params.push(req.user.base); }
    sql += ' ORDER BY p.created_at DESC';
    res.json((await query(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/purchases', auth, requireRole('admin', 'logistics_officer'), async (req, res) => {
  try {
    const { asset_id, quantity, base, notes } = req.body;
    if (!asset_id || !quantity || !base) return res.status(400).json({ error: 'Missing fields' });
    const targetBase = req.user.role !== 'admin' ? req.user.base : base;
    await query('INSERT INTO purchases (asset_id,quantity,base,purchased_by,notes) VALUES ($1,$2,$3,$4,$5)',
      [asset_id, quantity, targetBase, req.user.id, notes]);
    await query('UPDATE assets SET quantity = quantity + $1 WHERE id = $2 AND base = $3',
      [quantity, asset_id, targetBase]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/transfers', auth, async (req, res) => {
  try {
    let sql = `SELECT t.*, a.name as asset_name, u.username as transferred_by_name
      FROM transfers t JOIN assets a ON t.asset_id = a.id JOIN users u ON t.transferred_by = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { sql += ' AND (t.from_base = $1 OR t.to_base = $2)'; params.push(req.user.base, req.user.base); }
    sql += ' ORDER BY t.created_at DESC';
    res.json((await query(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/transfers', auth, requireRole('admin', 'base_commander'), async (req, res) => {
  try {
    const { asset_id, quantity, from_base, to_base, notes } = req.body;
    if (!asset_id || !quantity || !from_base || !to_base) return res.status(400).json({ error: 'Missing fields' });
    const asset = (await query('SELECT * FROM assets WHERE id = $1 AND base = $2', [asset_id, from_base])).rows[0];
    if (!asset || asset.quantity < quantity) return res.status(400).json({ error: 'Insufficient quantity' });
    await query('INSERT INTO transfers (asset_id,quantity,from_base,to_base,transferred_by,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [asset_id, quantity, from_base, to_base, req.user.id, notes, 'approved']);
    await query('UPDATE assets SET quantity = quantity - $1 WHERE id = $2 AND base = $3',
      [quantity, asset_id, from_base]);
    const dest = (await query('SELECT * FROM assets WHERE name = $1 AND base = $2', [asset.name, to_base])).rows[0];
    if (dest) {
      await query('UPDATE assets SET quantity = quantity + $1 WHERE id = $2', [quantity, dest.id]);
    } else {
      await query('INSERT INTO assets (name,category,base,quantity) VALUES ($1,$2,$3,$4)',
        [asset.name, asset.category, to_base, quantity]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/assignments', auth, async (req, res) => {
  try {
    let sql = `SELECT a.*, ast.name as asset_name, u.username as assigned_by_name
      FROM assignments a JOIN assets ast ON a.asset_id = ast.id JOIN users u ON a.assigned_by = u.id WHERE 1=1`;
    const params = [];
    if (req.user.role !== 'admin') { sql += ' AND a.base = $1'; params.push(req.user.base); }
    sql += ' ORDER BY a.created_at DESC';
    res.json((await query(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/assignments', auth, async (req, res) => {
  try {
    const { asset_id, quantity, base, assigned_to, type, notes } = req.body;
    if (!asset_id || !quantity || !base || !assigned_to || !type) return res.status(400).json({ error: 'Missing fields' });
    const targetBase = req.user.role !== 'admin' ? req.user.base : base;
    const asset = (await query('SELECT * FROM assets WHERE id = $1 AND base = $2', [asset_id, targetBase])).rows[0];
    if (!asset || asset.quantity < quantity) return res.status(400).json({ error: 'Insufficient quantity' });
    await query('INSERT INTO assignments (asset_id,quantity,base,assigned_to,assigned_by,type,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [asset_id, quantity, targetBase, assigned_to, req.user.id, type, notes]);
    await query('UPDATE assets SET quantity = quantity - $1 WHERE id = $2 AND base = $3',
      [quantity, asset_id, targetBase]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bases', auth, async (req, res) => {
  try {
    res.json((await query('SELECT DISTINCT base FROM assets')).rows.map(r => r.base));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', auth, requireRole('admin'), async (req, res) => {
  try {
    res.json((await query('SELECT id, username, role, base FROM users')).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

initDB().then(() => {
  app.listen(5000, () => console.log('Server running on port 5000'));
}).catch(console.error);