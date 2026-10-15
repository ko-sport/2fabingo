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
  totpConfirmed: boolean;
  totpLogin: boolean;
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
  totp_confirmed: number;
  totp_login: number;
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
  getDb()
    .prepare(
      "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
    )
    .run(token, userId, expiresAt);
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
  for (const token of tokens) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  const options = await sessionCookieOptions();
  jar.set(COOKIE, "", { ...options, maxAge: 0 });
}

function userForToken(token: string): PublicUser | null {
  if (!TOKEN_RE.test(token)) return null;
  const row = getDb()
    .prepare(
      `SELECT users.id AS id, users.username AS username,
              sessions.expires_at AS expires_at, users.totp_confirmed AS totp_confirmed,
              users.totp_login AS totp_login
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token) as SessionRow | undefined;
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) return null;
  return {
    id: Number(row.id),
    username: String(row.username),
    token,
    totpConfirmed: Number(row.totp_confirmed) === 1,
    totpLogin: Number(row.totp_login) === 1,
  };
}

export async function renewSession(token: string): Promise<void> {
  if (!TOKEN_RE.test(token)) return;
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const changed = getDb()
    .prepare("UPDATE sessions SET expires_at = ? WHERE token = ? AND expires_at > ?")
    .run(expiresAt, token, Date.now());
  if (Number(changed.changes) === 0) return;
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
    const user = userForToken(token);
    if (user) return user;
  }
  return null;
}

export async function getCurrentUser(fallbackToken?: string | null): Promise<PublicUser> {
  const user = await readSessionUser(fallbackToken);
  if (!user) redirect("/login");
  if (user.totpLogin && !user.totpConfirmed) redirect("/setup");
  return user;
}

export function redirectSignedIn(user: PublicUser | null): void {
  if (!user) return;
  if (user.totpLogin && !user.totpConfirmed) redirect("/setup");
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
  const db = getDb();
  db.prepare("DELETE FROM pending_auth WHERE user_id = ?").run(userId);
  db.prepare(
    "INSERT INTO pending_auth (token, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, purpose, expiresAt);
  const jar = await cookies();
  jar.set(PENDING, token, {
    ...(await sessionCookieOptions()),
    maxAge: PENDING_SECONDS,
  });
  return token;
}

function pendingForToken(token: string): PendingAuth | null {
  if (!TOKEN_RE.test(token)) return null;
  const row = getDb()
    .prepare(
      `SELECT pending_auth.user_id AS user_id, pending_auth.purpose AS purpose,
              pending_auth.expires_at AS expires_at, users.username AS username
       FROM pending_auth
       JOIN users ON users.id = pending_auth.user_id
       WHERE pending_auth.token = ?`,
    )
    .get(token) as
    | { user_id: number; purpose: string; expires_at: number; username: string }
    | undefined;
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
    const pending = pendingForToken(token);
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
  for (const token of tokens) {
    getDb().prepare("DELETE FROM pending_auth WHERE token = ?").run(token);
  }
  jar.set(PENDING, "", { ...(await sessionCookieOptions()), maxAge: 0 });
}
