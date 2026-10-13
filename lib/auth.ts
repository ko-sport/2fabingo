import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cacheLife } from "next/cache";
import { getDb } from "@/lib/db";

const COOKIE = "bingo_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type PublicUser = { id: number; username: string };

type SessionRow = {
  id: number;
  username: string;
  expires_at: number;
};

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  getDb()
    .prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
    )
    .run(token, userId, expiresAt);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  jar.delete(COOKIE);
}

export async function readSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT users.id AS id, users.username AS username, sessions.expires_at AS expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token) as SessionRow | undefined;
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) return null;
  return { id: Number(row.id), username: String(row.username) };
}

export async function getCurrentUser(): Promise<PublicUser> {
  "use cache: private";
  cacheLife({ stale: 30 });
  const user = await readSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function getOptionalUser(): Promise<PublicUser | null> {
  "use cache: private";
  cacheLife({ stale: 30 });
  return readSessionUser();
}
