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
  const groupKarmaStart = 200;
  const groupKarma = groupKarmaStart + runs.reduce((a, r) => { const m = String(r.karma || '').match(/\d+/); return a + (m ? parseInt(m[0], 10) : 0); }, 0);
  res.render('home', { title: 'Knoten', runs, charCount: chars.length, groupKarma, groupKarmaStart });
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
  let galleryArr = []; try { galleryArr = JSON.parse(c.gallery || '[]'); } catch (e) {}
  res.render('character', { title: c.name, c, canEdit, conns, runs, logs, galleryArr, knowsLinks: linkifyRunners(c.knows) });
});
app.post('/characters/:slug', loadChar, (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).render('error', { title: 'Kein Zugriff', msg: 'Nur SL oder der eigene Spieler.' });
  const b = req.body;
  db.prepare('UPDATE characters SET name=?,metatype=?,archetype=?,johnson_dossier=?,highlight_skills=?,sl_summary=?,background=?,background_sl=?,knows=? WHERE slug=?')
    .run(b.name || req.char.name, b.metatype || '', b.archetype || '', b.johnson_dossier || '', b.highlight_skills || '', b.sl_summary || '', b.background || '', b.background_sl || '', b.knows || '', req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/sheet', loadChar, uploadDoc.single('sheet'), (req, res) => {
  if (req.file) db.prepare('UPDATE characters SET sheet=? WHERE slug=?').run(req.file.filename, req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/images', loadChar, upload.array('images', 12), (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).end();
  let gal = []; try { gal = JSON.parse(req.char.gallery || '[]'); } catch (e) {}
  for (const f of (req.files || [])) gal.push(f.filename);
  const title = req.char.image || (gal[0] || null);
  db.prepare('UPDATE characters SET gallery=?, image=COALESCE(image,?) WHERE slug=?').run(JSON.stringify(gal), title, req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/title', loadChar, (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).end();
  let gal = []; try { gal = JSON.parse(req.char.gallery || '[]'); } catch (e) {}
  if (gal.includes(req.body.ref)) db.prepare('UPDATE characters SET image=? WHERE slug=?').run(req.body.ref, req.char.slug);
  res.redirect('/characters/' + req.char.slug);
});
app.post('/characters/:slug/image-del', loadChar, (req, res) => {
  if (!mayEditChar(req, res)) return res.status(403).end();
  let gal = []; try { gal = JSON.parse(req.char.gallery || '[]'); } catch (e) {}
  gal = gal.filter(g => g !== req.body.ref);
  let img = req.char.image;
  if (img === req.body.ref) img = gal[0] || null;
  db.prepare('UPDATE characters SET gallery=?, image=? WHERE slug=?').run(JSON.stringify(gal), img, req.char.slug);
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
  res.render('run', { title: r.title, r, isOwner: !!(r.owner_id && r.owner_id === res.locals.user.id), involvedLinks: linkifyNames(r.involved_connections), newLinks: linkifyNames(r.new_connections) });
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

// ---------- TICKETS (temporaer: Bugs & Wuensche der Nutzer) ----------
app.get('/tickets', (req, res) => {
  const tickets = db.prepare(`SELECT t.*, u.display_name authorName, u.username FROM tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC`).all();
  res.render('tickets', { title: 'Tickets', tickets });
});
app.post('/tickets', (req, res) => {
  const type = (req.body.type === 'wunsch') ? 'wunsch' : 'bug';
  const title = (req.body.title || '').trim() || 'Ohne Titel';
  db.prepare('INSERT INTO tickets (type,title,body,user_id,author,created_at) VALUES (?,?,?,?,?,?)')
    .run(type, title, req.body.body || '', res.locals.user.id, res.locals.user.display_name || res.locals.user.username, new Date().toISOString());
  res.redirect('/tickets');
});
app.post('/tickets/:id/delete', (req, res) => {
  const t = db.prepare('SELECT * FROM tickets WHERE id=?').get(req.params.id);
  if (t && (res.locals.user.role === 'sl' || t.user_id === res.locals.user.id))
    db.prepare('DELETE FROM tickets WHERE id=?').run(t.id);
  res.redirect('/tickets');
});
app.get('/tickets/export.md', requireSL, (req, res) => {
  const e = s => (s == null ? '' : String(s));
  const rows = db.prepare(`SELECT t.*, u.display_name authorName FROM tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY t.type, t.created_at`).all();
  let o = '# Schattennetz Hamburg — Tickets (Bugs & Wuensche)\n\nStand: ' + new Date().toISOString().slice(0,16).replace('T',' ') + '  ·  ' + rows.length + ' Tickets\n\n';
  for (const grp of ['bug','wunsch']) {
    const g = rows.filter(t => (t.type||'bug') === grp);
    if (!g.length) continue;
    o += (grp === 'bug' ? '## Bugs\n\n' : '## Wuensche\n\n');
    for (const t of g) o += `- **${e(t.title)}** — ${e(t.authorName || t.author)} (${e((t.created_at||'').slice(0,10))})\n${t.body ? '  ' + e(t.body).replace(/\n/g,'\n  ') + '\n' : ''}`;
    o += '\n';
  }
  res.type('text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tickets.md"');
  res.send(o);
});
app.post('/tickets/clear', requireSL, (req, res) => {
  db.prepare('DELETE FROM tickets').run();
  res.redirect('/tickets');
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
app.get('/sl/export.md', requireSL, (req, res) => {
  const e = s => (s == null ? '' : String(s));
  let o = '# Schattennetz Hamburg — Datenabzug\n\nStand: ' + new Date().toISOString().slice(0,16).replace('T',' ') + '\n\n';
  o += '## Charaktere\n\n';
  for (const c of db.prepare('SELECT * FROM characters ORDER BY sort').all()) {
    o += `### ${c.name}  (Spieler: ${e(c.player)})\n`;
    o += `- Metatyp: ${e(c.metatype)} | Archetyp: ${e(c.archetype)}\n`;
    if (c.magic) o += `- Magie/Resonanz: ${e(c.magic)}\n`;
    if (c.profile) o += `- Profil: ${e(c.profile)}\n`;
    if (c.signature) o += `- Signature: ${e(c.signature)}\n`;
    if (c.hooks) o += `- Hooks: ${e(c.hooks)}\n`;
    if (c.contacts) o += `- Kontakte (Bogen): ${e(c.contacts)}\n`;
    if (c.highlight_skills) o += `- Highlight-Skills: ${e(c.highlight_skills)}\n`;
    if (c.johnson_dossier) o += `- Johnson-Dossier: ${e(c.johnson_dossier)}\n`;
    if (c.background) o += `- Hintergrund (allgemein): ${e(c.background)}\n`;
    if (c.background_sl) o += `- Hintergrund (nur SL): ${e(c.background_sl)}\n`;
    if (c.sl_summary) o += `- SL-Zusammenfassung: ${e(c.sl_summary)}\n`;
    const lg = db.prepare('SELECT * FROM char_logs WHERE char_slug=? ORDER BY created_at').all(c.slug);
    if (lg.length) { o += `- Logs:\n`; for (const l of lg) o += `  - [${e(l.author)} ${e((l.created_at||'').slice(0,10))}] ${e(l.title)}: ${e(l.body)}\n`; }
    o += '\n';
  }
  o += '## Connections\n\n';
  for (const x of db.prepare('SELECT * FROM connections ORDER BY name').all()) {
    o += `### ${x.name} — ${e(x.role)}\n- Fraktion: ${e(x.faction)} | Ort: ${e(x.location)} | Status: ${e(x.status)}\n- Bekannt bei: ${e(x.shared_by)}\n`;
    if (x.preferences) o += `- Vorlieben: ${e(x.preferences)}\n`;
    if (x.history) o += `- Historie: ${e(x.history)}\n`;
    o += '\n';
  }
  o += '## Runs\n\n';
  for (const r of db.prepare('SELECT * FROM runs ORDER BY sort').all()) {
    o += `### ${e(r.number)} — ${e(r.title)}\n- Teilnehmer: ${e(r.participants)}\n- Ort: ${e(r.location)} | Zeit: ${e(r.time_from)} – ${e(r.time_to)} (${e(r.date_played)})\n- Karma: ${e(r.karma)} | Geld: ${e(r.nuyen)} | Beute: ${e(r.loot)}\n- Akteure: ${e(r.actors)}\n- Connections beteiligt: ${e(r.involved_connections)} | neu: ${e(r.new_connections)}\n- Bericht: ${e(r.summary)}\n\n`;
  }
  o += '## Metaplot (HDL) — nur SL\n\n';
  for (const m of db.prepare('SELECT * FROM metaplot ORDER BY owner').all()) o += `### [${e(m.code)}] ${e(m.title)} (${e(m.owner)})\n${e(m.body)}\n\n`;
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="schattennetz-export-' + new Date().toISOString().slice(0,10) + '.md"');
  res.send(o);
});
// SL: upload image for connection / character
app.post('/sl/img/:type/:slug', requireSL, upload.single('image'), (req, res) => {
  if (!req.file) return res.redirect('back');
  const table = ({connection:'connections', location:'locations', character:'characters'})[req.params.type] || 'characters';
  db.prepare(`UPDATE ${table} SET image=? WHERE slug=?`).run(req.file.filename, req.params.slug);
  res.redirect('back');
});
// SL: edit connection text
app.post('/sl/connection/:slug', requireSL, (req, res) => {
  const f = req.body;
  db.prepare('UPDATE connections SET role=?,faction=?,location=?,preferences=?,status=?,history=?,influence=? WHERE slug=?')
    .run(f.role, f.faction, f.location, f.preferences, f.status, f.history, f.influence, req.params.slug);
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

function linkifyRunners(str) {
  if (!str) return [];
  const norm = x => x.toLowerCase().replace(/[\u2018\u2019\u201A\u201C\u201D\u201E'`]/g, '').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  const map = {}; for (const c of db.prepare('SELECT slug,name FROM characters').all()) map[norm(c.name)] = c.slug;
  return str.split(/[,·;]/).map(x => x.trim()).filter(Boolean).map(name => ({ name, slug: map[norm(name.replace(/\(.*?\)/g, '').trim())] || null }));
}
function linkifyNames(str) {
  if (!str) return [];
  const norm = x => x.toLowerCase().replace(/[\u2018\u2019\u201A\u201C\u201D\u201E'`]/g, '').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  const map = {}; for (const c of db.prepare('SELECT slug,name FROM connections').all()) map[norm(c.name)] = c.slug;
  return str.split(/[,·;]/).map(x => x.trim()).filter(Boolean).map(name => ({ name, slug: map[norm(name.replace(/\(.*?\)/g, '').trim())] || null }));
}
// ---------- FRAKTIONEN ----------
app.get('/factions', (req, res) => {
  const rows = db.prepare('SELECT * FROM factions ORDER BY sort, name').all();
  res.render('factions', { title: 'Fraktionen', rows });
});
app.get('/factions/:slug', (req, res) => {
  const f = db.prepare('SELECT * FROM factions WHERE slug=?').get(req.params.slug);
  if (!f) return res.status(404).render('error', { title: '404', msg: 'Fraktion nicht gefunden.' });
  res.render('faction', { title: f.name, f, memberLinks: linkifyNames(f.notable_members) });
});
app.post('/sl/factions', requireSL, (req, res) => {
  const slug = (req.body.name || ('fraktion-' + Date.now())).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const maxSort = (db.prepare('SELECT MAX(sort) m FROM factions').get().m || 0) + 10;
  db.prepare('INSERT OR IGNORE INTO factions (slug,name,category,status,description,notable_members,sort) VALUES (?,?,?,?,?,?,?)')
    .run(slug, req.body.name || 'Neue Fraktion', '', '', '', '', maxSort);
  res.redirect('/factions/' + slug);
});
app.post('/sl/faction/:slug', requireSL, (req, res) => {
  const b = req.body;
  db.prepare('UPDATE factions SET name=?,category=?,status=?,description=?,notable_members=? WHERE slug=?')
    .run(b.name, b.category, b.status, b.description, b.notable_members, req.params.slug);
  res.redirect('/factions/' + req.params.slug);
});
app.post('/sl/faction/:slug/img', requireSL, upload.single('image'), (req, res) => {
  if (req.file) db.prepare('UPDATE factions SET image=? WHERE slug=?').run(req.file.filename, req.params.slug);
  res.redirect('/factions/' + req.params.slug);
});

// ---------- LOCATIONS ----------
app.get('/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY sort, name').all();
  res.render('locations', { title: 'Locations', rows });
});
app.get('/locations/:slug', (req, res) => {
  const l = db.prepare('SELECT * FROM locations WHERE slug=?').get(req.params.slug);
  if (!l) return res.status(404).render('error', { title: '404', msg: 'Location nicht gefunden.' });
  res.render('location', { title: l.name, l, notableLinks: linkifyNames(l.notable) });
});
app.post('/sl/locations', requireSL, (req, res) => {
  const slug = (req.body.name || ('ort-' + Date.now())).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const maxSort = (db.prepare('SELECT MAX(sort) m FROM locations').get().m || 0) + 10;
  db.prepare('INSERT OR IGNORE INTO locations (slug,name,area,type,status,description,notable,sort) VALUES (?,?,?,?,?,?,?,?)')
    .run(slug, req.body.name || 'Neue Location', '', '', '', '', '', maxSort);
  res.redirect('/locations/' + slug);
});
app.post('/sl/location/:slug', requireSL, (req, res) => {
  const b = req.body;
  db.prepare('UPDATE locations SET name=?,area=?,type=?,status=?,description=?,notable=? WHERE slug=?')
    .run(b.name, b.area, b.type, b.status, b.description, b.notable, req.params.slug);
  res.redirect('/locations/' + req.params.slug);
});

app.use((req, res) => res.status(404).render('error', { title: '404', msg: 'Seite nicht gefunden.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Schattennetz Hamburg laeuft auf Port ' + PORT));
