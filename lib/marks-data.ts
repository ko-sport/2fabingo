import "server-only";
import { getDb } from "@/lib/db";

const MAX_COUNT = 9999;

type MarkRow = { code: number; count: number };

export async function listMarks(userId: number): Promise<[number, number][]> {
  const db = await getDb();
  const rows = await db.all<MarkRow>(
    "SELECT code, count FROM marks WHERE user_id = ? ORDER BY code",
    [userId],
  );
  return rows.map((row) => [Number(row.code), Number(row.count)]);
}

export async function listRecent(
  userId: number,
  limit = 20,
): Promise<{ code: number; count: number }[]> {
  const db = await getDb();
  const rows = await db.all<MarkRow>(
    `SELECT code, count FROM marks
     WHERE user_id = ?
     ORDER BY updated_at DESC, code DESC
     LIMIT ?`,
    [userId, limit],
  );
  return rows.map((row) => ({
    code: Number(row.code),
    count: Number(row.count),
  }));
}

export async function applyGrouped(
  userId: number,
  grouped: Map<number, number>,
): Promise<[number, number][]> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const out: [number, number][] = [];
    for (const [code, delta] of grouped) {
      if (!Number.isInteger(code) || code < 0 || code > 999999) continue;
      if (!Number.isInteger(delta) || delta === 0) continue;
      if (delta > 0) {
        const amount = Math.min(MAX_COUNT, delta);
        const row = await tx.get<{ count: number }>(
          `INSERT INTO marks (user_id, code, count, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(user_id, code) DO UPDATE SET
             count = MIN(${MAX_COUNT}, count + ?),
             updated_at = datetime('now')
           RETURNING count`,
          [userId, code, amount, amount],
        );
        out.push([code, Number(row?.count ?? amount)]);
        continue;
      }
      const existing = await tx.get<{ count: number }>(
        "SELECT count FROM marks WHERE user_id = ? AND code = ?",
        [userId, code],
      );
      const next = (existing ? Number(existing.count) : 0) + delta;
      if (next <= 0) {
        await tx.run("DELETE FROM marks WHERE user_id = ? AND code = ?", [userId, code]);
        out.push([code, 0]);
      } else {
        await tx.run(
          "UPDATE marks SET count = ?, updated_at = datetime('now') WHERE user_id = ? AND code = ?",
          [next, userId, code],
        );
        out.push([code, next]);
      }
    }
    return out;
  });
}

