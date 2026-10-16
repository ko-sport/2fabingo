import "server-only";
import type { SqlDb } from "@/lib/db";
import { nextUsername } from "@/lib/google-username";

export async function unusedUsername(db: SqlDb, base: string): Promise<string> {
  let username = base.slice(0, 20);
  for (let taken = 2; taken < 1000; taken += 1) {
    const row = await db.get<{ id: number }>("SELECT id FROM users WHERE username = ?", [username]);
    if (!row) return username;
    username = nextUsername(base, taken);
  }
  return username;
}
