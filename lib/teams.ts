import "server-only";
import { getDb, type SqlDb } from "@/lib/db";
import { parseMarkedAt } from "@/lib/mark-day";
import type { TeamBoard } from "@/lib/team-shape";
import {
  canonicalTeamName,
  makeJoinCode,
  validateJoinCode,
  validateTeamName,
} from "@/lib/team-code";

const MAX_COUNT = 9999;

async function membership(db: SqlDb, userId: number): Promise<number | null> {
  const row = await db.get<{ team_id: number }>(
    "SELECT team_id FROM team_members WHERE user_id = ?",
    [userId],
  );
  return row ? Number(row.team_id) : null;
}

export async function loadTeam(userId: number): Promise<TeamBoard | null> {
  const db = await getDb();
  const teamId = await membership(db, userId);
  if (teamId === null) return null;
  const team = await db.get<{ name: string; join_code: string }>(
    "SELECT name, join_code FROM teams WHERE id = ?",
    [teamId],
  );
  if (!team) return null;
  const members = await db.all<{ username: string; user_id: number }>(
    `SELECT users.username, team_members.user_id
     FROM team_members
     JOIN users ON users.id = team_members.user_id
     WHERE team_members.team_id = ?
     ORDER BY team_members.joined_at, users.username`,
    [teamId],
  );
  const marks = await db.all<{ code: number; count: number }>(
    `SELECT code, SUM(count) AS count
     FROM team_marks
     WHERE team_id = ?
     GROUP BY code
     HAVING SUM(count) > 0
     ORDER BY code`,
    [teamId],
  );
  const recent = await db.all<{ code: number; count: number; updated_at: string }>(
    `SELECT code, SUM(count) AS count, MAX(updated_at) AS updated_at
     FROM team_marks
     WHERE team_id = ?
     GROUP BY code
     HAVING SUM(count) > 0
     ORDER BY MAX(updated_at) DESC, code DESC
     LIMIT 20`,
    [teamId],
  );
  return {
    name: team.name,
    joinCode: team.join_code,
    members: members.map((member) => ({
      username: member.username,
      you: Number(member.user_id) === userId,
    })),
    marks: marks.map((row) => [Number(row.code), Number(row.count)]),
    recent: recent.map((row) => ({
      code: Number(row.code),
      count: Number(row.count),
      markedAt: parseMarkedAt(String(row.updated_at)).toISOString(),
    })),
  };
}

export async function createTeam(userId: number, rawName: string): Promise<TeamBoard | { error: string }> {
  const name = canonicalTeamName(rawName);
  const nameError = validateTeamName(name);
  if (nameError) return { error: nameError };
  const db = await getDb();
  if ((await membership(db, userId)) !== null) {
    return { error: "Leave your current team before starting another." };
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const joinCode = makeJoinCode();
    try {
      const created = await db.transaction(async (tx) => {
        const inserted = await tx.run("INSERT INTO teams (name, join_code) VALUES (?, ?)", [name, joinCode]);
        await tx.run("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [
          inserted.lastInsertRowid,
          userId,
        ]);
        return true;
      });
      if (created) {
        const board = await loadTeam(userId);
        if (board) return board;
      }
    } catch {
      /* Try another code if this one was taken. */
    }
  }
  return { error: "Couldn’t create that team." };
}

export async function joinTeam(userId: number, rawCode: string): Promise<TeamBoard | { error: string }> {
  const codeError = validateJoinCode(rawCode);
  if (codeError) return { error: codeError };
  const code = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const db = await getDb();
  const team = await db.get<{ id: number }>("SELECT id FROM teams WHERE join_code = ?", [code]);
  if (!team) return { error: "No team uses that code." };
  const current = await membership(db, userId);
  if (current === Number(team.id)) {
    const board = await loadTeam(userId);
    return board ?? { error: "Couldn’t open that team." };
  }
  if (current !== null) return { error: "Leave your current team before joining another." };
  await db.run("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", [Number(team.id), userId]);
  const board = await loadTeam(userId);
  return board ?? { error: "Couldn’t open that team." };
}

export async function leaveTeam(userId: number): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM team_members WHERE user_id = ?", [userId]);
}

export async function teamTotal(
  tx: SqlDb,
  teamId: number,
  code: number,
): Promise<number> {
  const row = await tx.get<{ count: number }>(
    "SELECT COALESCE(SUM(count), 0) AS count FROM team_marks WHERE team_id = ? AND code = ?",
    [teamId, code],
  );
  return Number(row?.count ?? 0);
}

export async function bumpTeamMark(
  tx: SqlDb,
  teamId: number,
  userId: number,
  code: number,
  delta: number,
): Promise<void> {
  if (delta > 0) {
    const amount = Math.min(MAX_COUNT, delta);
    await tx.run(
      `INSERT INTO team_marks (team_id, user_id, code, count, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(team_id, user_id, code) DO UPDATE SET
         count = MIN(${MAX_COUNT}, count + ?),
         updated_at = datetime('now')`,
      [teamId, userId, code, amount, amount],
    );
    return;
  }
  const existing = await tx.get<{ count: number }>(
    "SELECT count FROM team_marks WHERE team_id = ? AND user_id = ? AND code = ?",
    [teamId, userId, code],
  );
  const next = (existing ? Number(existing.count) : 0) + delta;
  if (next <= 0) {
    await tx.run("DELETE FROM team_marks WHERE team_id = ? AND user_id = ? AND code = ?", [
      teamId,
      userId,
      code,
    ]);
    return;
  }
  await tx.run(
    "UPDATE team_marks SET count = ?, updated_at = datetime('now') WHERE team_id = ? AND user_id = ? AND code = ?",
    [next, teamId, userId, code],
  );
}

export async function teamIdFor(tx: SqlDb, userId: number): Promise<number | null> {
  return membership(tx, userId);
}
