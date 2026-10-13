import "server-only";
import { getDb } from "@/lib/db";

const MAX_COUNT = 9999;

type MarkRow = { code: number; count: number };

export function listMarks(userId: number): [number, number][] {
  const rows = getDb()
    .prepare("SELECT code, count FROM marks WHERE user_id = ? ORDER BY code")
    .all(userId) as MarkRow[];
  return rows.map((row) => [Number(row.code), Number(row.count)]);
}

export function listRecent(
  userId: number,
  limit = 8,
): { code: number; count: number }[] {
  const rows = getDb()
    .prepare(
      `SELECT code, count FROM marks
       WHERE user_id = ?
       ORDER BY updated_at DESC, code DESC
       LIMIT ?`,
    )
    .all(userId, limit) as MarkRow[];
  return rows.map((row) => ({
    code: Number(row.code),
    count: Number(row.count),
  }));
}

export function applyGrouped(
  userId: number,
  grouped: Map<number, number>,
): [number, number][] {
  const db = getDb();
  const out: [number, number][] = [];
  const upsert = db.prepare(
    `INSERT INTO marks (user_id, code, count, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, code) DO UPDATE SET
       count = MIN(${MAX_COUNT}, count + ?),
       updated_at = datetime('now')
     RETURNING count`,
  );
  const read = db.prepare(
    "SELECT count FROM marks WHERE user_id = ? AND code = ?",
  );
  const update = db.prepare(
    "UPDATE marks SET count = ?, updated_at = datetime('now') WHERE user_id = ? AND code = ?",
  );
  const remove = db.prepare(
    "DELETE FROM marks WHERE user_id = ? AND code = ?",
  );

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const [code, delta] of grouped) {
      if (!Number.isInteger(code) || code < 0 || code > 999999) continue;
      if (!Number.isInteger(delta) || delta === 0) continue;
      if (delta > 0) {
        const amount = Math.min(MAX_COUNT, delta);
        const row = upsert.get(userId, code, amount, amount) as {
          count: number;
        };
        out.push([code, Number(row.count)]);
        continue;
      }
      const existing = read.get(userId, code) as { count: number } | undefined;
      const next = (existing ? Number(existing.count) : 0) + delta;
      if (next <= 0) {
        remove.run(userId, code);
        out.push([code, 0]);
      } else {
        update.run(next, userId, code);
        out.push([code, next]);
      }
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return out;
}

export function replaceMarks(userId: number, marks: [number, number][]) {
  const db = getDb();
  const removeAll = db.prepare("DELETE FROM marks WHERE user_id = ?");
  const insert = db.prepare(
    "INSERT INTO marks (user_id, code, count, updated_at) VALUES (?, ?, ?, datetime('now'))",
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    removeAll.run(userId);
    const seen = new Set<number>();
    for (const [code, count] of marks) {
      if (!Number.isInteger(code) || code < 0 || code > 999999) continue;
      if (seen.has(code)) continue;
      const stored = Math.max(1, Math.min(MAX_COUNT, Math.floor(count)));
      if (!Number.isFinite(stored)) continue;
      insert.run(userId, code, stored);
      seen.add(code);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
