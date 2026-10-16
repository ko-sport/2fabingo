import "server-only";
import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { needsPartitionedCookies } from "@/lib/cookie-policy";
import { getDb } from "@/lib/db";
import { SESSION_SECONDS } from "@/lib/session";

const COOKIE = "bingo_session";
const PENDING = "bingo_pending";
const PENDING_SECONDS = 60 * 10;

export type PublicUser = {
  id: number;
  username: string;
  token: string;
};

export type PendingAuth = {
  userId: number;
  purpose: "enroll" | "login";
  username: string;
  token: string;
};

const TOKEN_RE = /^[a-f0-9]{64}$/;

type SessionRow = {
  id: number;
  username: string;
  expires_at: number;
};

async function sessionCookieOptions() {
  const headerList = await headers();
  const remote = needsPartitionedCookies({
    host: headerList.get("host"),
    forwardedHost: headerList.get("x-forwarded-host"),
    forwardedProto: headerList.get("x-forwarded-proto"),
    origin: headerList.get("origin"),
  });
  if (remote) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
      maxAge: SESSION_SECONDS,
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const db = await getDb();
  await db.run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", [
    token,
    userId,
    expiresAt,
  ]);
  const jar = await cookies();
  jar.set(COOKIE, token, await sessionCookieOptions());
  return token;
}

export async function destroySession(explicit?: string | null): Promise<void> {
  const jar = await cookies();
  const tokens = new Set<string>();
  if (explicit && TOKEN_RE.test(explicit)) tokens.add(explicit);
  for (const cookie of jar.getAll()) {
    if (cookie.name === COOKIE && TOKEN_RE.test(cookie.value)) tokens.add(cookie.value);
  }
  const db = await getDb();
  for (const token of tokens) {
    await db.run("DELETE FROM sessions WHERE token = ?", [token]);
  }
  const options = await sessionCookieOptions();
  jar.set(COOKIE, "", { ...options, maxAge: 0 });
}

async function userForToken(token: string): Promise<PublicUser | null> {
  if (!TOKEN_RE.test(token)) return null;
  const db = await getDb();
  const row = await db.get<SessionRow>(
    `SELECT users.id AS id, users.username AS username,
            sessions.expires_at AS expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
    [token],
  );
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) return null;
  return {
    id: Number(row.id),
    username: String(row.username),
    token,
  };
}

export async function renewSession(token: string): Promise<void> {
  if (!TOKEN_RE.test(token)) return;
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const db = await getDb();
  const changed = await db.run(
    "UPDATE sessions SET expires_at = ? WHERE token = ? AND expires_at > ?",
    [expiresAt, token, Date.now()],
  );
  if (changed.changes === 0) return;
  const jar = await cookies();
  jar.set(COOKIE, token, await sessionCookieOptions());
}

export async function readSessionUser(
  fallbackToken?: string | null,
): Promise<PublicUser | null> {
  await connection();
  const jar = await cookies();
  const tokens = jar
    .getAll()
    .filter((cookie) => cookie.name === COOKIE)
    .map((cookie) => cookie.value);
  if (fallbackToken) tokens.push(fallbackToken);
  for (const token of tokens) {
    const user = await userForToken(token);
    if (user) return user;
  }
  return null;
}

export async function getCurrentUser(fallbackToken?: string | null): Promise<PublicUser> {
  const user = await readSessionUser(fallbackToken);
  if (!user) redirect("/login");
  return user;
}

export function redirectSignedIn(user: PublicUser | null): void {
  if (!user) return;
  redirect(`/board?session=${user.token}`);
}

export async function getOptionalUser(): Promise<PublicUser | null> {
  return readSessionUser();
}

export async function beginPending(
  userId: number,
  purpose: "enroll" | "login",
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + PENDING_SECONDS * 1000;
  const db = await getDb();
  await db.run("DELETE FROM pending_auth WHERE user_id = ?", [userId]);
  await db.run(
    "INSERT INTO pending_auth (token, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)",
    [token, userId, purpose, expiresAt],
  );
  const jar = await cookies();
  jar.set(PENDING, token, {
    ...(await sessionCookieOptions()),
    maxAge: PENDING_SECONDS,
  });
  return token;
}

async function pendingForToken(token: string): Promise<PendingAuth | null> {
  if (!TOKEN_RE.test(token)) return null;
  const db = await getDb();
  const row = await db.get<{
    user_id: number;
    purpose: string;
    expires_at: number;
    username: string;
  }>(
    `SELECT pending_auth.user_id AS user_id, pending_auth.purpose AS purpose,
            pending_auth.expires_at AS expires_at, users.username AS username
     FROM pending_auth
     JOIN users ON users.id = pending_auth.user_id
     WHERE pending_auth.token = ?`,
    [token],
  );
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) return null;
  if (row.purpose !== "enroll" && row.purpose !== "login") return null;
  return {
    userId: Number(row.user_id),
    purpose: row.purpose,
    username: String(row.username),
    token,
  };
}

export async function readPending(explicit?: string | null): Promise<PendingAuth | null> {
  await connection();
  const jar = await cookies();
  const tokens: string[] = [];
  if (explicit) tokens.push(explicit);
  for (const cookie of jar.getAll()) {
    if (cookie.name === PENDING && !tokens.includes(cookie.value)) tokens.push(cookie.value);
  }
  for (const token of tokens) {
    const pending = await pendingForToken(token);
    if (pending) return pending;
  }
  return null;
}

export async function clearPending(explicit?: string | null): Promise<void> {
  const jar = await cookies();
  const tokens = new Set<string>();
  if (explicit && TOKEN_RE.test(explicit)) tokens.add(explicit);
  for (const cookie of jar.getAll()) {
    if (cookie.name === PENDING && TOKEN_RE.test(cookie.value)) tokens.add(cookie.value);
  }
  const db = await getDb();
  for (const token of tokens) {
    await db.run("DELETE FROM pending_auth WHERE token = ?", [token]);
  }
  jar.set(PENDING, "", { ...(await sessionCookieOptions()), maxAge: 0 });
}
