const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('better-sqlite3');
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
const db = sqlite3(path.join(__dirname, 'military.db'));

// Init tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','base_commander','logistics_officer')),
    base TEXT
  );
  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    base TEXT NOT NULL,
    purchased_by INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    from_base TEXT NOT NULL,
    to_base TEXT NOT NULL,
    transferred_by INTEGER NOT NULL,
    status TEXT DEFAULT 'approved',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    base TEXT NOT NULL,
    assigned_to TEXT NOT NULL,
    assigned_by INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('assignment','expenditure')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
initUsers(db);
initAssets(db);

// Seed data
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  const hash = (pw) => bcrypt.hashSync(pw, 10);
  db.prepare('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)').run('admin', hash('admin123'), 'admin', null);
  db.prepare('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)').run('commander_alpha', hash('pass123'), 'base_commander', 'Alpha Base');
  db.prepare('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)').run('commander_bravo', hash('pass123'), 'base_commander', 'Bravo Base');
  db.prepare('INSERT INTO users (username,password,role,base) VALUES (?,?,?,?)').run('logistics1', hash('pass123'), 'logistics_officer', 'Alpha Base');

  const ins = db.prepare('INSERT INTO assets (name,category,base,quantity) VALUES (?,?,?,?)');
  [
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
  ].forEach(a => ins.run(...a));
}

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, base: user.base }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, base: user.base } });
});

// Dashboard
app.get('/api/dashboard', auth, (req, res) => {
  const f = req.user.role !== 'admin' ? `AND base = '${req.user.base}'` : '';
  const stats = {
    totalAssets: db.prepare(`SELECT SUM(quantity) as t FROM assets WHERE 1=1 ${f}`).get()?.t || 0,
    vehicles: db.prepare(`SELECT SUM(quantity) as t FROM assets WHERE category='vehicle' ${f}`).get()?.t || 0,
    weapons: db.prepare(`SELECT SUM(quantity) as t FROM assets WHERE category='weapon' ${f}`).get()?.t || 0,
    ammunition: db.prepare(`SELECT SUM(quantity) as t FROM assets WHERE category='ammunition' ${f}`).get()?.t || 0,
    pendingTransfers: db.prepare(`SELECT COUNT(*) as t FROM transfers WHERE status='pending'`).get()?.t || 0,
    recentPurchases: db.prepare(`SELECT COUNT(*) as t FROM purchases WHERE created_at >= date('now','-30 days')`).get()?.t || 0,
  };
  const assetsByBase = db.prepare(`SELECT base, SUM(quantity) as total FROM assets WHERE 1=1 ${f} GROUP BY base`).all();
  const assetsByCategory = db.prepare(`SELECT category, SUM(quantity) as total FROM assets WHERE 1=1 ${f} GROUP BY category`).all();
  res.json({ stats, assetsByBase, assetsByCategory });
});

// Assets
app.get('/api/assets', auth, (req, res) => {
  const { base, category } = req.query;
  let query = 'SELECT * FROM assets WHERE 1=1';
  const params = [];
  if (req.user.role !== 'admin') { query += ' AND base = ?'; params.push(req.user.base); }
  else if (base) { query += ' AND base = ?'; params.push(base); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  res.json(db.prepare(query).all(...params));
});

app.get('/api/bases', auth, (req, res) => {
  res.json(db.prepare('SELECT DISTINCT base FROM assets').all().map(r => r.base));
});

app.get('/api/users', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT id, username, role, base FROM users').all());
});

// Routes
app.use('/api/purchases', purchasesRouter(db));
app.use('/api/transfers', transfersRouter(db));
app.use('/api/assignments', assignmentsRouter(db));

app.listen(5000, () => console.log('Server running on port 5000'));