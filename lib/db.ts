import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createClient, type Client, type ResultSet, type Transaction } from "@libsql/client";

export type SqlValue = string | number | bigint | null;
export type SqlArgs = SqlValue[];

export type SqlDb = {
  get<T>(sql: string, args?: SqlArgs): Promise<T | undefined>;
  all<T>(sql: string, args?: SqlArgs): Promise<T[]>;
  run(sql: string, args?: SqlArgs): Promise<{ changes: number; lastInsertRowid: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T>;
};

const CLIENT = 1;

const globalForDb = globalThis as unknown as {
  bingoClient?: Promise<SqlDb>;
  bingoClientVersion?: number;
};

const SCHEMA_SQL = `
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
`;

function rowsOf<T>(result: ResultSet): T[] {
  return result.rows.map((row) => {
    const record: Record<string, unknown> = {};
    for (let index = 0; index < result.columns.length; index += 1) {
      record[result.columns[index]] = row[index];
    }
    return record as T;
  });
}

function outcome(result: ResultSet): { changes: number; lastInsertRowid: number } {
  return {
    changes: Number(result.rowsAffected),
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
  };
}

function wrapLibsql(executor: Client | Transaction, begin?: () => Promise<Transaction>): SqlDb {
  const db: SqlDb = {
    async get<T>(sql: string, args: SqlArgs = []) {
      const result = await executor.execute({ sql, args });
      return rowsOf<T>(result)[0];
    },
    async all<T>(sql: string, args: SqlArgs = []) {
      const result = await executor.execute({ sql, args });
      return rowsOf<T>(result);
    },
    async run(sql: string, args: SqlArgs = []) {
      return outcome(await executor.execute({ sql, args }));
    },
    async exec(sql: string) {
      if ("executeMultiple" in executor) await executor.executeMultiple(sql);
    },
    async transaction(fn) {
      if (!begin) return fn(db);
      const tx = await begin();
      try {
        const value = await fn(wrapLibsql(tx));
        await tx.commit();
        return value;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },
  };
  return db;
}

function wrapSqlite(sqlite: DatabaseSync, inTransaction = false): SqlDb {
  const db: SqlDb = {
    async get<T>(sql: string, args: SqlArgs = []) {
      return sqlite.prepare(sql).get(...args) as T | undefined;
    },
    async all<T>(sql: string, args: SqlArgs = []) {
      return sqlite.prepare(sql).all(...args) as T[];
    },
    async run(sql: string, args: SqlArgs = []) {
      const result = sqlite.prepare(sql).run(...args);
      return {
        changes: Number(result.changes),
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    },
    async exec(sql: string) {
      sqlite.exec(sql);
    },
    async transaction(fn) {
      if (inTransaction) return fn(db);
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const value = await fn(wrapSqlite(sqlite, true));
        sqlite.exec("COMMIT");
        return value;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return db;
}

async function migrate(db: SqlDb): Promise<void> {
  await db.exec(SCHEMA_SQL);
  const columns = await db.all<{ name: string }>("PRAGMA table_info(users)");
  const names = new Set(columns.map((column) => column.name));
  if (!names.has("totp_secret")) await db.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT");
  if (!names.has("totp_confirmed")) {
    await db.exec("ALTER TABLE users ADD COLUMN totp_confirmed INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.has("freebie_on")) await db.exec("ALTER TABLE users ADD COLUMN freebie_on TEXT");
  if (!names.has("freebie_code")) await db.exec("ALTER TABLE users ADD COLUMN freebie_code INTEGER");
  if (!names.has("totp_login")) {
    await db.exec("ALTER TABLE users ADD COLUMN totp_login INTEGER NOT NULL DEFAULT 0");
    await db.exec("UPDATE users SET totp_login = 1 WHERE totp_confirmed = 1");
  }
}

function hostedRuntime(): boolean {
  return Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
}

async function openDb(): Promise<SqlDb> {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!authToken) throw new Error("Set TURSO_AUTH_TOKEN next to TURSO_DATABASE_URL.");
    const client = createClient({ url, authToken });
    const db = wrapLibsql(client, () => client.transaction("write"));
    await migrate(db);
    return db;
  }
  if (hostedRuntime()) {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN so accounts survive on Netlify.");
  }
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const sqlite = new DatabaseSync(path.join(dir, "bingo.db"));
  sqlite.exec("PRAGMA journal_mode = WAL;");
  const db = wrapSqlite(sqlite);
  await migrate(db);
  return db;
}

export function getDb(): Promise<SqlDb> {
  if (!globalForDb.bingoClient || globalForDb.bingoClientVersion !== CLIENT) {
    const pending = openDb().catch((error) => {
      globalForDb.bingoClient = undefined;
      globalForDb.bingoClientVersion = undefined;
      throw error;
    });
    globalForDb.bingoClient = pending;
    globalForDb.bingoClientVersion = CLIENT;
  }
  return globalForDb.bingoClient;
}
