const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

const { initUsers } = require('./models/user');
const { initAssets } = require('./models/asset');
const { auth, requireRole } = require('./middleware/auth');
const purchasesRouter = require('./routes/purchases');
const transfersRouter = require('./routes/transfers');
const assignmentsRouter = require('./routes/assignments');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = 'military_secret_key_2024';
const db = new sqlite3.Database(path.join(__dirname, 'military.db'));

const run = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, function(err) { if (err) rej(err); else res(this); }));
const get = (sql, params = []) => new Promise((res, rej) =>
  db.get(sql, params, (err, row) => { if (err) rej(err); else res(row); }));
const all = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => { if (err) rej(err); else res(rows); }));

const initDB = async () => {
  await initUsers(run);
  await initAssets(run);

  await run(`CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    base TEXT NOT NULL,
    purchased_by INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    from_base TEXT NOT NULL,
    to_base TEXT NOT NULL,
    transferred_by INTEGER NOT NULL,
    status TEXT DEFAULT 'approved',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    base TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    assigned_by INTEGER NOT NULL,
    type TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const userCount = await get('SELECT COUNT(*) as c FROM users');
  if (userCount.c === 0) {
    const hash = (pw) => bcrypt.hashSync(pw, 10);
    await run('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)',
      ['admin', hash('admin123'), 'admin', null]);
    await run('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)',
      ['commander_alpha', hash('pass123'), 'base_commander', 'Alpha Base']);
    await run('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)',
      ['commander_bravo', hash('pass123'), 'base_commander', 'Bravo Base']);
    await run('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)',
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
      await run('INSERT INTO assets (name,category,base,quantity) VALUES (?,?,?,?)', a);
    }
  }
};

// Auth route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, base: user.base },
      JWT_SECRET, { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, base: user.base } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dashboard
app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const f = req.user.role !== 'admin' ? `AND base = '${req.user.base}'` : '';
    const totalAssets = (await get(`SELECT SUM(quantity) as t FROM assets WHERE 1=1 ${f}`))?.t || 0;
    const vehicles = (await get(`SELECT SUM(quantity) as t FROM assets WHERE category='vehicle' ${f}`))?.t || 0;
    const weapons = (await get(`SELECT SUM(quantity) as t FROM assets WHERE category='weapon' ${f}`))?.t || 0;
    const ammunition = (await get(`SELECT SUM(quantity) as t FROM assets WHERE category='ammunition' ${f}`))?.t || 0;
    const pendingTransfers = (await get(`SELECT COUNT(*) as t FROM transfers WHERE status='pending'`))?.t || 0;
    const recentPurchases = (await get(`SELECT COUNT(*) as t FROM purchases WHERE created_at >= date('now','-30 days')`))?.t || 0;
    const assetsByBase = await all(`SELECT base, SUM(quantity) as total FROM assets WHERE 1=1 ${f} GROUP BY base`);
    const assetsByCategory = await all(`SELECT category, SUM(quantity) as total FROM assets WHERE 1=1 ${f} GROUP BY category`);
    res.json({
      stats: { totalAssets, vehicles, weapons, ammunition, pendingTransfers, recentPurchases },
      assetsByBase,
      assetsByCategory
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Assets
app.get('/api/assets', auth, async (req, res) => {
  try {
    const { base, category } = req.query;
    let query = 'SELECT * FROM assets WHERE 1=1';
    const params = [];
    if (req.user.role !== 'admin') { query += ' AND base = ?'; params.push(req.user.base); }
    else if (base) { query += ' AND base = ?'; params.push(base); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    res.json(await all(query, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Bases
app.get('/api/bases', auth, async (req, res) => {
  try {
    res.json((await all('SELECT DISTINCT base FROM assets')).map(r => r.base));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Users
app.get('/api/users', auth, requireRole('admin'), async (req, res) => {
  try {
    res.json(await all('SELECT id, username, role, base FROM users'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Route files
app.use('/api/purchases', purchasesRouter(run, get, all));
app.use('/api/transfers', transfersRouter(run, get, all));
app.use('/api/assignments', assignmentsRouter(run, get, all));

// Start
initDB().then(() => {
  app.listen(5000, () => console.log('Server running on port 5000'));
}).catch(console.error);