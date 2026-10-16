import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type ResultSet, type Transaction } from "@libsql/client";
import {
  DATABASE_CONNECTION_MESSAGE,
  databaseConfigMessage,
  schemaStatements,
} from "@/lib/db-config";

export type SqlValue = string | number | bigint | null;
export type SqlArgs = SqlValue[];

export type SqlDb = {
  get<T>(sql: string, args?: SqlArgs): Promise<T | undefined>;
  all<T>(sql: string, args?: SqlArgs): Promise<T[]>;
  run(sql: string, args?: SqlArgs): Promise<{ changes: number; lastInsertRowid: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: SqlDb) => Promise<T>): Promise<T>;
};

const CLIENT = 2;

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

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
    const named = row as unknown as Record<string, unknown>;
    for (let index = 0; index < result.columns.length; index += 1) {
      const column = result.columns[index];
      const indexed = (row as unknown as unknown[])[index];
      record[column] = indexed === undefined ? named[column] : indexed;
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

type LocalSqlite = {
  prepare(sql: string): {
    get(...args: SqlArgs): unknown;
    all(...args: SqlArgs): unknown[];
    run(...args: SqlArgs): { changes: number | bigint; lastInsertRowid: number | bigint };
  };
  exec(sql: string): void;
};

function wrapSqlite(sqlite: LocalSqlite, inTransaction = false): SqlDb {
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

async function migrate(db: SqlDb, remote: boolean): Promise<void> {
  if (remote) {
    for (const statement of schemaStatements(SCHEMA_SQL)) {
      try {
        await db.run(statement);
      } catch (error) {
        if (/^pragma\b/i.test(statement)) continue;
        throw error;
      }
    }
  } else {
    await db.exec(SCHEMA_SQL);
  }
  const columns = await db.all<{ name: string }>("PRAGMA table_info(users)");
  const names = new Set(columns.map((column) => column.name));
  const apply = async (sql: string) => {
    if (remote) await db.run(sql);
    else await db.exec(sql);
  };
  if (!names.has("totp_secret")) await apply("ALTER TABLE users ADD COLUMN totp_secret TEXT");
  if (!names.has("totp_confirmed")) {
    await apply("ALTER TABLE users ADD COLUMN totp_confirmed INTEGER NOT NULL DEFAULT 0");
  }
  if (!names.has("freebie_on")) await apply("ALTER TABLE users ADD COLUMN freebie_on TEXT");
  if (!names.has("freebie_code")) await apply("ALTER TABLE users ADD COLUMN freebie_code INTEGER");
  if (!names.has("totp_login")) {
    await apply("ALTER TABLE users ADD COLUMN totp_login INTEGER NOT NULL DEFAULT 0");
    await apply("UPDATE users SET totp_login = 1 WHERE totp_confirmed = 1");
  }
}

function hostedRuntime(): boolean {
  return Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
}

async function openDb(): Promise<SqlDb> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  const configMessage = databaseConfigMessage({
    url,
    token: authToken,
    hosted: hostedRuntime(),
  });
  if (configMessage) throw new DatabaseConfigError(configMessage);
  if (url && authToken) {
    const client = createClient({ url, authToken });
    const db = wrapLibsql(client, () => client.transaction("write"));
    await migrate(db, true);
    return db;
  }
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const { DatabaseSync } = await import("node:sqlite");
  const sqlite = new DatabaseSync(path.join(dir, "bingo.db"));
  sqlite.exec("PRAGMA journal_mode = WAL;");
  const db = wrapSqlite(sqlite);
  await migrate(db, false);
  return db;
}

export async function databaseMessage(): Promise<string | null> {
  try {
    await getDb();
    return null;
  } catch (error) {
    if (error instanceof DatabaseConfigError) return error.message;
    console.error(error);
    return DATABASE_CONNECTION_MESSAGE;
  }
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
