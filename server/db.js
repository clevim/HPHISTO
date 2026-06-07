const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'hphisto.db');

const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT    NOT NULL DEFAULT '',
    password_hash TEXT    NOT NULL,
    created_at    INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id         TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT    PRIMARY KEY,
    os          TEXT    NOT NULL DEFAULT '',
    customer_name TEXT  NOT NULL DEFAULT '',
    contact     TEXT    NOT NULL DEFAULT '',
    deadline    TEXT    NOT NULL DEFAULT '',
    focus       TEXT    NOT NULL DEFAULT '',
    color       TEXT    NOT NULL DEFAULT '',
    model       TEXT    NOT NULL DEFAULT '{}',
    client_id   TEXT    DEFAULT NULL,
    quote_id    TEXT    DEFAULT NULL,
    status      TEXT    NOT NULL DEFAULT 'novo',
    seen        INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER DEFAULT (unixepoch())
  );
`);

const _get = db.prepare('SELECT value FROM kv WHERE key = ?');
const _set = db.prepare(
  'INSERT OR REPLACE INTO kv (key, value, updated_at) VALUES (?, ?, unixepoch())'
);

const EMPTY_STATE = {
  printers: [], materials: [], history: [],
  schedule: [], catalog: [], clients: [], settings: {},
};

function readState() {
  const row = _get.get('state');
  if (!row) return { ...EMPTY_STATE };
  try { return JSON.parse(row.value); } catch { return { ...EMPTY_STATE }; }
}

function writeState(state) { _set.run('state', JSON.stringify(state)); }

module.exports = { db, readState, writeState, DB_PATH };
