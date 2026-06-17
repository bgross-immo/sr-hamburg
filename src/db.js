const path = require('path');
const fs = require('fs');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
const FILE = path.join(DATA_DIR, 'app.db');

let db;
try {
  // Production (Docker node:20): native, fast.
  const Database = require('better-sqlite3');
  db = new Database(FILE);
  db.pragma('journal_mode = WAL');
} catch (e) {
  // Fallback (e.g. sandbox / node:sqlite). Thin adapter with the same surface we use.
  const { DatabaseSync } = require('node:sqlite');
  const d = new DatabaseSync(FILE);
  try { d.exec('PRAGMA journal_mode = DELETE'); } catch (_) {}
  db = {
    exec: (sql) => d.exec(sql),
    pragma: () => {},
    prepare: (sql) => {
      const st = d.prepare(sql);
      return {
        run: (...a) => st.run(...a),
        get: (...a) => st.get(...a),
        all: (...a) => st.all(...a),
      };
    },
  };
  console.warn('[db] better-sqlite3 nicht verfuegbar — nutze node:sqlite Fallback.');
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player', password_hash TEXT NOT NULL, must_change INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, player TEXT, metatype TEXT,
  archetype TEXT, magic TEXT, profile TEXT, signature TEXT, hooks TEXT, contacts TEXT, image TEXT, sort INTEGER DEFAULT 100);
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT, faction TEXT, location TEXT,
  preferences TEXT, status TEXT, history TEXT, shared_by TEXT, campaign_relevant INTEGER DEFAULT 0, image TEXT);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, number TEXT, title TEXT NOT NULL, date_played TEXT,
  participants TEXT, summary TEXT, images TEXT, sort INTEGER DEFAULT 100);
CREATE TABLE IF NOT EXISTS timeline (
  id INTEGER PRIMARY KEY, when_label TEXT, title TEXT NOT NULL, body TEXT, run_slug TEXT, sort INTEGER DEFAULT 100);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT, body TEXT, shared INTEGER NOT NULL DEFAULT 0, updated_at TEXT);
CREATE TABLE IF NOT EXISTS metaplot (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, code TEXT NOT NULL, owner TEXT NOT NULL, title TEXT, body TEXT, updated_at TEXT);
`);

db.exec(`CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, image TEXT, note TEXT, sort INTEGER DEFAULT 100);`);

// --- Migration: erweiterte Run-Felder (idempotent) ---
try {
  const rc = db.prepare("PRAGMA table_info(runs)").all().map(c => c.name);
  const add = { owner_id:'INTEGER', location:'TEXT', time_from:'TEXT', time_to:'TEXT',
    karma:'TEXT', nuyen:'TEXT', loot:'TEXT', new_connections:'TEXT', involved_connections:'TEXT', actors:'TEXT',
    date_start:'TEXT', tod_start:'TEXT', date_end:'TEXT', tod_end:'TEXT' };
  for (const [c,t] of Object.entries(add)) if (!rc.includes(c)) db.exec(`ALTER TABLE runs ADD COLUMN ${c} ${t}`);
} catch (e) { console.error('run migration', e); }

// --- Migration: erweiterte Charakter-Felder + Char-Logs ---
try {
  const cc = db.prepare("PRAGMA table_info(characters)").all().map(c => c.name);
  const addc = { owner_id:'INTEGER', johnson_dossier:'TEXT', highlight_skills:'TEXT', sl_summary:'TEXT', background:'TEXT', background_sl:'TEXT', sheet:'TEXT', gallery:'TEXT', knows:'TEXT' };
  for (const [c,t] of Object.entries(addc)) if (!cc.includes(c)) db.exec(`ALTER TABLE characters ADD COLUMN ${c} ${t}`);
} catch (e) { console.error('char migration', e); }
db.exec(`CREATE TABLE IF NOT EXISTS factions (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT, status TEXT, description TEXT, notable_members TEXT, image TEXT, sort INTEGER DEFAULT 100);`);
db.exec(`CREATE TABLE IF NOT EXISTS char_logs (
  id INTEGER PRIMARY KEY, char_slug TEXT NOT NULL, user_id INTEGER, author TEXT, title TEXT, body TEXT, created_at TEXT);`);

try {
  const conc = db.prepare("PRAGMA table_info(connections)").all().map(c => c.name);
  if (!conc.includes('influence')) db.exec("ALTER TABLE connections ADD COLUMN influence TEXT");
} catch (e) { console.error('conn migration', e); }
db.exec(`CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, area TEXT, type TEXT,
  status TEXT, description TEXT, notable TEXT, image TEXT, sort INTEGER DEFAULT 100);`);

db.exec(`CREATE TABLE IF NOT EXISTS plots (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, owner TEXT, body TEXT, images TEXT, sort INTEGER DEFAULT 100, created_at TEXT);`);
db.exec(`CREATE TABLE IF NOT EXISTS plot_links (
  id INTEGER PRIMARY KEY, plot_slug TEXT NOT NULL, entity_type TEXT NOT NULL, entity_slug TEXT NOT NULL,
  UNIQUE(plot_slug, entity_type, entity_slug));`);
db.exec(`CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY, type TEXT, title TEXT NOT NULL, body TEXT, user_id INTEGER, author TEXT, created_at TEXT);`);

module.exports = db;
