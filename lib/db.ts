import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = 3;

const globalForDb = globalThis as unknown as {
  bingoDb?: DatabaseSync;
  bingoSchema?: number;
};

function columnNames(db: DatabaseSync, table: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

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
    CREATE TABLE IF NOT EXISTS pending_auth (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL CHECK (purpose IN ('enroll', 'login')),
      expires_at INTEGER NOT NULL
    );
  `);
  const users = columnNames(db, "users");
  if (!users.has("totp_secret")) db.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT");
  if (!users.has("totp_confirmed")) {
    db.exec("ALTER TABLE users ADD COLUMN totp_confirmed INTEGER NOT NULL DEFAULT 0");
  }
  if (!users.has("freebie_on")) db.exec("ALTER TABLE users ADD COLUMN freebie_on TEXT");
  if (!users.has("freebie_code")) db.exec("ALTER TABLE users ADD COLUMN freebie_code INTEGER");
  if (!users.has("totp_login")) {
    db.exec("ALTER TABLE users ADD COLUMN totp_login INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE users SET totp_login = 1 WHERE totp_confirmed = 1");
  }
}

export function getDb(): DatabaseSync {
  if (!globalForDb.bingoDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    globalForDb.bingoDb = new DatabaseSync(path.join(dir, "bingo.db"));
  }
  if (globalForDb.bingoSchema !== SCHEMA) {
    migrate(globalForDb.bingoDb);
    globalForDb.bingoSchema = SCHEMA;
  }
  return globalForDb.bingoDb;
}
