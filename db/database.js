require('dotenv').config();

// Dual-mode database: PostgreSQL (Neon) when DATABASE_URL is set, SQLite otherwise
if (process.env.DATABASE_URL) {
  // ── PostgreSQL mode ──────────────────────────────────────────────────────────
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  async function query(text, params) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  module.exports = { query, pool };
} else {
  // ── SQLite fallback mode (local dev without Neon) ───────────────────────────
  const Database = require('better-sqlite3');
  const path = require('path');

  const db = new Database(path.join(__dirname, '..', 'marketeruz.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Ensure tables exist (idempotent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      section TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(slug, section)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      body TEXT,
      section TEXT NOT NULL,
      category TEXT,
      role TEXT,
      tags TEXT,
      image TEXT,
      date TEXT,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT,
      url TEXT NOT NULL,
      public_id TEXT,
      post_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
    );
  `);

  // Wrap SQLite sync API in the same async interface as pg
  async function query(text, params = []) {
    // Convert $1,$2,... placeholders to ? for SQLite
    // Also replace PostgreSQL NOW() with SQLite datetime('now')
    const sql = text
      .replace(/\$\d+/g, '?')
      .replace(/\bNOW\(\)/gi, "datetime('now')")
      .replace(/\bNULLS LAST\b/gi, '');  // SQLite doesn't support NULLS LAST (it's default)

    // Detect statement type
    const trimmed = sql.trimStart().toUpperCase();

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = db.prepare(sql).all(...params);
      return { rows };
    }

    if (trimmed.startsWith('INSERT') && /RETURNING/i.test(sql)) {
      // Strip RETURNING clause and fetch the inserted row manually
      const withoutReturning = sql.replace(/\s+RETURNING\s+\*/i, '');
      const result = db.prepare(withoutReturning).run(...params);
      const table = sql.match(/INTO\s+(\w+)/i)?.[1];
      const row = table
        ? db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid)
        : null;
      return { rows: row ? [row] : [], rowCount: result.changes };
    }

    if (trimmed.startsWith('UPDATE') && /RETURNING/i.test(sql)) {
      const withoutReturning = sql.replace(/\s+RETURNING\s+\*/i, '');
      const idMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
      db.prepare(withoutReturning).run(...params);
      if (idMatch) {
        const table = sql.match(/UPDATE\s+(\w+)/i)?.[1];
        const id = params[params.length - 1];
        const row = table
          ? db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
          : null;
        return { rows: row ? [row] : [] };
      }
      return { rows: [] };
    }

    // Plain INSERT / UPDATE / DELETE
    const result = db.prepare(sql).run(...params);
    return { rows: [], rowCount: result.changes };
  }

  module.exports = { query, pool: null };
}
