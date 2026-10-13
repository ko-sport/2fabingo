import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as unknown as { bingoDb?: DatabaseSync };

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS marks (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code INTEGER NOT NULL CHECK (code >= 0 AND code <= 999999),
      count INTEGER NOT NULL CHECK (count > 0 AND count <= 9999),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, code)
    );
    CREATE INDEX IF NOT EXISTS marks_user_updated ON marks(user_id, updated_at DESC);
  `);
}

export function getDb(): DatabaseSync {
  if (!globalForDb.bingoDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new DatabaseSync(path.join(dir, "bingo.db"));
    migrate(db);
    globalForDb.bingoDb = db;
  }
  return globalForDb.bingoDb;
}
