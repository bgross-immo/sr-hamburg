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

module.exports = db;
