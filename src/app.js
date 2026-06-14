const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./db');

// seed on boot (idempotent)
try { require('./seed'); } catch (e) { console.error('seed error', e); }

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

const UPLOAD_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'uploads');
const upload = multer({
  storage: multer.diskStorage({
    destination: (r, f, cb) => cb(null, UPLOAD_DIR),
    filename: (r, f, cb) => cb(null, Date.now() + '-' + f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (r, f, cb) => cb(null, /^image\//.test(f.mimetype)),
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 30 },
}));

// current user + helpers in locals
app.use((req, res, next) => {
  if (req.session.uid) {
    res.locals.user = db.prepare('SELECT id,username,display_name,role,must_change FROM users WHERE id=?').get(req.session.uid);
  } else res.locals.user = null;
  res.locals.path = req.path;
  next();
});

// gate: login required everywhere except login + static
app.use((req, res, next) => {
  if (req.path === '/login' || req.path.startsWith('/static')) return next();
  if (!res.locals.user) return res.redirect('/login');
  // force password change on first login
  if (res.locals.user.must_change && !req.path.startsWith('/account') && req.path !== '/logout') return res.redirect('/account');
  next();
});
// uploads only for logged-in users
app.use('/uploads', express.static(UPLOAD_DIR));

const requireSL = (req, res, next) => res.locals.user && res.locals.user.role === 'sl' ? next() : res.status(403).render('error', { title: 'Zugriff verweigert', msg: 'Nur Spielleitung.' });

// ---------- AUTH ----------
app.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect('/');
  res.render('login', { title: 'Login', error: null });
});
app.post('/login', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE username=?').get((req.body.username || '').toLowerCase().trim());
  if (!u || !bcrypt.compareSync(req.body.password || '', u.password_hash))
    return res.render('login', { title: 'Login', error: 'Falscher Benutzer oder falsches Passwort.' });
  req.session.uid = u.id;
  res.redirect(u.must_change ? '/account' : '/');
});
app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

app.get('/account', (req, res) => res.render('account', { title: 'Konto', msg: null }));
app.post('/account/password', (req, res) => {
  const { current, pw1, pw2 } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(res.locals.user.id);
  if (!res.locals.user.must_change && !bcrypt.compareSync(current || '', u.password_hash))
    return res.render('account', { title: 'Konto', msg: 'Aktuelles Passwort falsch.' });
  if (!pw1 || pw1.length < 6 || pw1 !== pw2)
    return res.render('account', { title: 'Konto', msg: 'Neues Passwort min. 6 Zeichen und beide gleich.' });
  db.prepare('UPDATE users SET password_hash=?, must_change=0 WHERE id=?').run(bcrypt.hashSync(pw1, 10), u.id);
  res.redirect('/');
});

// ---------- HOME ----------
app.get('/', (req, res) => {
  const runs = db.prepare('SELECT * FROM runs ORDER BY sort').all();
  const chars = db.prepare("SELECT * FROM characters WHERE metatype != '—' ORDER BY sort").all();
  res.render('home', { title: 'Knoten', runs, charCount: chars.length });
});

// ---------- CHARACTERS ----------
const uploadDoc = multer({
  storage: multer.diskStorage({ destination: (r, f, cb) => cb(null, UPLOAD_DIR), filename: (r, f, cb) => cb(null, Date.now() + '-' + f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')) }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (r, f, cb) => cb(null, /^image\/|application\/pdf/.test(f.mimetype)),
});
function loadChar(req, res, next) {
  req.char = db.prepare('SELECT * FROM characters WHERE slug=?').get(req.params.slug);
  if (!req.char) return res.status(404).render('error', { title: '404', msg: 'Runner nicht gefunden.' });
  next();
}
function mayEditChar(req, res) { const u = res.locals.user, c = req.char; return u.role === 'sl' || (c.owner_id && c.owner_id === u.id); }

app.get('/characters', (req, res) => {
  const rows = db.prepare('SELECT * FROM characters ORDER BY sort').all();
  const byPlayer = {};
  for (const c of rows) (byPlayer[c.player || '—'] ||= []).push(c);
  res.render('characters', { title: 'Runner', byPlayer });
});
app.get('/characters/:slug', loadChar, (req, res) => {
  const c = req.char, u = res.locals.user;
  const canEdit = mayEditChar(req, res);
  const conns = db.prepare("SELECT * FROM connections WHERE shared_by LIKE '%'||?||'%' ORDER BY campaign_relevant DESC, name").all(c.name);
  const runs = db.prepare("SELECT slug,number,title,date_played FROM runs WHERE participants LIKE '%'||?||'%' ORDER BY sort").all(c.name);
  const logs = canEdit ? db.prepare('SELECT * FROM char_logs WHERE char_slug=? ORDER BY created_at DESC').all(c.slug) : [];
  res.render('character', { title: c.name, c, canEdit, conns, runs, logs });
});
app.post('/characters/:slug', loadChar, (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).render('error', { title: 'Kein Zugriff', msg: 'Nur SL oder der eigene Spieler.' });
  const b = req.body;
  db.prepare('UPDATE characters SET name=?,metatype=?,archetype=?,johnson_dossier=?,highlight_skills=?,sl_summary=?,background=? WHERE slug=?')
    .run(b.name || req.char.name, b.metatype || '', b.archetype || '', b.johnson_dossier || '', b.highlight_skills || '', b.sl_summary || '', b.background || '', req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/sheet', loadChar, uploadDoc.single('sheet'), (req, res) => {
  if (req.file) db.prepare('UPDATE characters SET sheet=? WHERE slug=?').run(req.file.filename, req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/image', loadChar, upload.single('image'), (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).end();
  if (req.file) db.prepare('UPDATE characters SET image=? WHERE slug=?').run(req.file.filename, req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/log', loadChar, (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).end();
  const u = res.locals.user;
  db.prepare('INSERT INTO char_logs (char_slug,user_id,author,title,body,created_at) VALUES (?,?,?,?,?,?)')
    .run(req.char.slug, u.id, u.display_name, req.body.title || '', req.body.body || '', new Date().toISOString());
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/log/:id/delete', loadChar, (req, res) => {
  const u = res.locals.user, log = db.prepare('SELECT * FROM char_logs WHERE id=?').get(req.params.id);
  if (log && (log.user_id === u.id || u.role === 'sl')) db.prepare('DELETE FROM char_logs WHERE id=?').run(log.id);
  res.redirect('/characters/' + req.char.slug);
});

// ---------- CONNECTIONS ----------
app.get('/connections', (req, res) => {
  const rows = db.prepare('SELECT * FROM connections ORDER BY campaign_relevant DESC, name').all();
  res.render('connections', { title: 'Kontakte', rows });
});
app.get('/connections/:slug', (req, res) => {
  const x = db.prepare('SELECT * FROM connections WHERE slug=?').get(req.params.slug);
  if (!x) return res.status(404).render('error', { title: '404', msg: 'Kontakt nicht gefunden.' });
  res.render('connection', { title: x.name, x });
});

// ---------- RUNS ----------
function loadRun(req, res, next) {
  req.run = db.prepare('SELECT * FROM runs WHERE slug=?').get(req.params.slug);
  if (!req.run) return res.status(404).render('error', { title: '404', msg: 'Run nicht gefunden.' });
  next();
}
function requireRunOwner(req, res, next) {
  if (req.run && req.run.owner_id && req.run.owner_id === res.locals.user.id) return next();
  return res.status(403).render('error', { title: 'Kein Zugriff', msg: 'Diesen Run darf nur sein Ersteller bearbeiten.' });
}
app.get('/runs', (req, res) => {
  const rows = db.prepare('SELECT * FROM runs ORDER BY sort').all();
  res.render('runs', { title: 'Logbuch', rows });
});
app.post('/runs', requireSL, (req, res) => {
  const slug = (req.body.slug || ('run-' + Date.now())).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const maxSort = (db.prepare('SELECT MAX(sort) m FROM runs').get().m || 0) + 10;
  db.prepare('INSERT INTO runs (slug,number,title,participants,summary,images,owner_id,sort) VALUES (?,?,?,?,?,?,?,?)')
    .run(slug, req.body.number || '', req.body.title || 'Neuer Run', req.body.participants || '', req.body.summary || '', '[]', res.locals.user.id, maxSort);
  res.redirect('/runs/' + slug + '/edit');
});
app.get('/runs/:slug', loadRun, (req, res) => {
  const r = req.run; r.imageList = JSON.parse(r.images || '[]');
  res.render('run', { title: r.title, r, isOwner: !!(r.owner_id && r.owner_id === res.locals.user.id) });
});
app.get('/runs/:slug/edit', loadRun, requireRunOwner, (req, res) => {
  const r = req.run; r.imageList = JSON.parse(r.images || '[]');
  res.render('run-edit', { title: 'Bearbeiten: ' + r.title, r });
});
app.post('/runs/:slug', loadRun, requireRunOwner, upload.array('images', 12), (req, res) => {
  const r = req.run; let imgs = JSON.parse(r.images || '[]');
  for (const f of (req.files || [])) imgs.push(f.filename);
  const b = req.body;
  db.prepare(`UPDATE runs SET title=?,number=?,date_played=?,participants=?,location=?,time_from=?,time_to=?,karma=?,nuyen=?,loot=?,new_connections=?,involved_connections=?,actors=?,summary=?,images=? WHERE slug=?`)
    .run(b.title||r.title, b.number||'', b.date_played||'', b.participants||'', b.location||'', b.time_from||'', b.time_to||'', b.karma||'', b.nuyen||'', b.loot||'', b.new_connections||'', b.involved_connections||'', b.actors||'', b.summary||'', JSON.stringify(imgs), r.slug);
  res.redirect('/runs/' + r.slug);
});

// ---------- TIMELINE ----------
app.get('/timeline', (req, res) => {
  const rows = db.prepare('SELECT * FROM timeline ORDER BY sort').all();
  res.render('timeline', { title: 'Zeitleiste', rows });
});

// ---------- NOTES ----------
app.get('/notes', (req, res) => {
  const mine = db.prepare('SELECT * FROM notes WHERE user_id=? ORDER BY updated_at DESC').all(res.locals.user.id);
  const shared = db.prepare(`SELECT n.*, u.display_name author FROM notes n JOIN users u ON u.id=n.user_id WHERE n.shared=1 AND n.user_id!=? ORDER BY n.updated_at DESC`).all(res.locals.user.id);
  res.render('notes', { title: 'Notizen', mine, shared });
});
app.post('/notes', (req, res) => {
  db.prepare('INSERT INTO notes (user_id,title,body,shared,updated_at) VALUES (?,?,?,?,?)')
    .run(res.locals.user.id, req.body.title || 'Ohne Titel', req.body.body || '', req.body.shared ? 1 : 0, new Date().toISOString());
  res.redirect('/notes');
});
app.post('/notes/:id', (req, res) => {
  const n = db.prepare('SELECT * FROM notes WHERE id=?').get(req.params.id);
  if (!n || n.user_id !== res.locals.user.id) return res.status(403).end();
  if (req.body._delete) db.prepare('DELETE FROM notes WHERE id=?').run(n.id);
  else db.prepare('UPDATE notes SET title=?,body=?,shared=?,updated_at=? WHERE id=?')
    .run(req.body.title || 'Ohne Titel', req.body.body || '', req.body.shared ? 1 : 0, new Date().toISOString(), n.id);
  res.redirect('/notes');
});

// ---------- SL AREA ----------
app.get('/sl', requireSL, (req, res) => {
  const tiles = db.prepare('SELECT * FROM metaplot ORDER BY owner').all();
  res.render('sl', { title: 'SL // Hintergrund', tiles });
});
app.post('/sl/meta/:slug', requireSL, (req, res) => {
  db.prepare('UPDATE metaplot SET title=?,body=?,updated_at=? WHERE slug=?')
    .run(req.body.title, req.body.body, new Date().toISOString(), req.params.slug);
  res.redirect('/sl');
});
// SL: upload image for connection / character
app.post('/sl/img/:type/:slug', requireSL, upload.single('image'), (req, res) => {
  if (!req.file) return res.redirect('back');
  const table = req.params.type === 'connection' ? 'connections' : 'characters';
  db.prepare(`UPDATE ${table} SET image=? WHERE slug=?`).run(req.file.filename, req.params.slug);
  res.redirect('back');
});
// SL: edit connection text
app.post('/sl/connection/:slug', requireSL, (req, res) => {
  const f = req.body;
  db.prepare('UPDATE connections SET role=?,faction=?,location=?,preferences=?,status=?,history=? WHERE slug=?')
    .run(f.role, f.faction, f.location, f.preferences, f.status, f.history, req.params.slug);
  res.redirect('/connections/' + req.params.slug);
});


// ---------- MAPS ----------
app.get('/maps', (req, res) => {
  const rows = db.prepare('SELECT * FROM maps ORDER BY sort').all();
  res.render('maps', { title: 'Karten', rows });
});
app.post('/sl/maps', requireSL, upload.single('image'), (req, res) => {
  if (req.file) {
    const slug = (req.body.title || ('karte-' + Date.now())).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const maxSort = (db.prepare('SELECT MAX(sort) m FROM maps').get().m || 0) + 10;
    db.prepare('INSERT INTO maps (slug,title,image,note,sort) VALUES (?,?,?,?,?)')
      .run(slug, req.body.title || 'Karte', req.file.filename, req.body.note || '', maxSort);
  }
  res.redirect('/maps');
});

app.use((req, res) => res.status(404).render('error', { title: '404', msg: 'Seite nicht gefunden.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Schattennetz Hamburg laeuft auf Port ' + PORT));
