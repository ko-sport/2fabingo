"use server";

import { redirect } from "next/navigation";
import {
  beginPending,
  clearPending,
  createSession,
  destroySession,
  readPending,
  readSessionUser,
  renewSession,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { claimDailyFreebie } from "@/lib/marks-data";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { parseCode } from "@/lib/codes";
import { createSecret, verifyTotp } from "@/lib/totp";
import { validatePassword, validateUsername } from "@/lib/validators";

export type AuthState = {
  error?: string;
  usernameError?: string;
  passwordError?: string;
};

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  totp_secret: string | null;
  totp_confirmed: number;
  totp_login: number;
};

function loadUser(id: number): UserRow | undefined {
  return getDb()
    .prepare(
      `SELECT id, username, password_hash, totp_secret, totp_confirmed, totp_login
       FROM users WHERE id = ?`,
    )
    .get(id) as UserRow | undefined;
}

function ensureSecret(userId: number): string {
  const db = getDb();
  const row = db
    .prepare("SELECT totp_secret FROM users WHERE id = ?")
    .get(userId) as { totp_secret: string | null } | undefined;
  if (row?.totp_secret) return row.totp_secret;
  const secret = createSecret();
  db.prepare(
    "UPDATE users SET totp_secret = ? WHERE id = ? AND totp_secret IS NULL",
  ).run(secret, userId);
  const again = db
    .prepare("SELECT totp_secret FROM users WHERE id = ?")
    .get(userId) as { totp_secret: string };
  return again.totp_secret;
}

function finishLogin(userId: number, secret: string, username: string, rawCode: string) {
  const code = parseCode(rawCode.replace(/\D/g, ""));
  if (code === null || !verifyTotp(secret, username, String(code).padStart(6, "0"))) {
    return false;
  }
  claimDailyFreebie(userId, code);
  return true;
}

export async function registerAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const wantsAuthenticator = formData.get("authenticator") === "on";
  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  if (usernameError || passwordError) {
    return {
      usernameError: usernameError ?? undefined,
      passwordError: passwordError ?? undefined,
    };
  }

  const existing = getDb()
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username);
  if (existing) return { usernameError: "That username is already taken." };

  const passwordHash = await hashPassword(password);
  if (!wantsAuthenticator) {
    const result = getDb()
      .prepare(
        "INSERT INTO users (username, password_hash, totp_confirmed, totp_login) VALUES (?, ?, 0, 0)",
      )
      .run(username, passwordHash);
    const token = await createSession(Number(result.lastInsertRowid));
    redirect(`/board?session=${token}`);
  }

  const secret = createSecret();
  const result = getDb()
    .prepare(
      "INSERT INTO users (username, password_hash, totp_secret, totp_confirmed, totp_login) VALUES (?, ?, ?, 0, 1)",
    )
    .run(username, passwordHash, secret);
  const ticket = await beginPending(Number(result.lastInsertRowid), "enroll");
  redirect(`/setup?ticket=${ticket}`);
}

export async function loginAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const row = getDb()
    .prepare(
      `SELECT id, password_hash, totp_secret, totp_confirmed, totp_login
       FROM users WHERE username = ?`,
    )
    .get(username) as UserRow | undefined;
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    return { error: "Those details don’t match an account." };
  }

  if (Number(row.totp_login) === 1) {
    if (!row.totp_secret || Number(row.totp_confirmed) !== 1) {
      ensureSecret(Number(row.id));
      const ticket = await beginPending(Number(row.id), "enroll");
      redirect(`/setup?ticket=${ticket}`);
    }
    const ticket = await beginPending(Number(row.id), "login");
    redirect(`/login/code?ticket=${ticket}`);
  }

  const token = await createSession(Number(row.id));
  redirect(`/board?session=${token}`);
}

export async function enrollAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ticket = String(formData.get("ticket") ?? "");
  const pending = await readPending(ticket);
  const session = await readSessionUser();
  const userId = session && !session.totpConfirmed ? session.id : pending?.purpose === "enroll" ? pending.userId : null;
  if (userId === null) redirect("/login");

  const user = loadUser(userId);
  if (!user) redirect("/login");
  const secret = ensureSecret(user.id);
  const raw = String(formData.get("code") ?? "");
  const digits = raw.replace(/\D/g, "");
  if (!verifyTotp(secret, user.username, digits)) {
    return { error: "That code doesn’t match. Wait for a fresh one and try again." };
  }

  getDb()
    .prepare("UPDATE users SET totp_confirmed = 1, totp_login = 1 WHERE id = ?")
    .run(user.id);
  const code = parseCode(digits);
  if (code !== null) claimDailyFreebie(user.id, code);
  await clearPending(pending?.token ?? ticket);
  if (session) await destroySession(session.token);
  const token = await createSession(user.id);
  redirect(`/board?session=${token}`);
}

export async function loginCodeAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ticket = String(formData.get("ticket") ?? "");
  const pending = await readPending(ticket);
  if (!pending || pending.purpose !== "login") redirect("/login");
  const user = loadUser(pending.userId);
  if (!user?.totp_secret || Number(user.totp_confirmed) !== 1) redirect("/setup");

  const digits = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!finishLogin(user.id, user.totp_secret, user.username, digits)) {
    return { error: "That code doesn’t match. Wait for a fresh one and try again." };
  }
  await clearPending(pending.token);
  const token = await createSession(user.id);
  redirect(`/board?session=${token}`);
}

export async function touchSessionAction(sessionToken: string): Promise<void> {
  await renewSession(sessionToken);
}

export async function passwordOnlyAction(formData: FormData): Promise<void> {
  const ticket = String(formData.get("ticket") ?? "");
  const pending = await readPending(ticket);
  const session = await readSessionUser();
  const userId = pending?.userId ?? session?.id ?? null;
  if (userId === null) redirect("/login");
  getDb().prepare("UPDATE users SET totp_login = 0 WHERE id = ?").run(userId);
  await clearPending(pending?.token ?? ticket);
  if (session) await destroySession(session.token);
  const token = await createSession(userId);
  redirect(`/board?session=${token}`);
}

export async function setAuthenticatorAction(formData: FormData): Promise<void> {
  const sessionToken = String(formData.get("session") ?? "");
  const user = await readSessionUser(sessionToken);
  if (!user) redirect("/login");
  const enable = String(formData.get("enabled") ?? "") === "1";
  if (!enable) {
    getDb().prepare("UPDATE users SET totp_login = 0 WHERE id = ?").run(user.id);
    redirect(`/board?session=${user.token}`);
  }
  if (user.totpConfirmed) {
    getDb().prepare("UPDATE users SET totp_login = 1 WHERE id = ?").run(user.id);
    redirect(`/board?session=${user.token}`);
  }
  ensureSecret(user.id);
  const ticket = await beginPending(user.id, "enroll");
  redirect(`/setup?ticket=${ticket}`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  await destroySession(String(formData.get("session") ?? ""));
  await clearPending();
  redirect("/");
}
