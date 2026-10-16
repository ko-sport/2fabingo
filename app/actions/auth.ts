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
import { databaseMessage, getDb } from "@/lib/db";
import { claimDailyFreebie } from "@/lib/marks-data";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { createSecret, verifyTotp } from "@/lib/totp";
import { unusedUsername } from "@/lib/account-name";
import { parseCode } from "@/lib/codes";
import { checkEmailCode, clearEmailChallenge, deliverEmailCode } from "@/lib/email-signin";
import { usernameFromGoogle } from "@/lib/google-username";
import { EMAIL_SENDER_MISSING, emailDelivery } from "@/lib/mail";
import { normalizeEmail, validateEmail, validatePassword } from "@/lib/validators";

export type AuthState = {
  error?: string;
  emailError?: string;
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

type LoginRow = {
  id: number;
  password_hash: string;
  totp_secret: string | null;
  totp_confirmed: number;
  totp_login: number;
  email_login: number;
  email: string | null;
};

async function loadUser(id: number): Promise<UserRow | undefined> {
  const db = await getDb();
  return db.get<UserRow>(
    `SELECT id, username, password_hash, totp_secret, totp_confirmed, totp_login
     FROM users WHERE id = ?`,
    [id],
  );
}

async function ensureSecret(userId: number): Promise<string> {
  const db = await getDb();
  const row = await db.get<{ totp_secret: string | null }>(
    "SELECT totp_secret FROM users WHERE id = ?",
    [userId],
  );
  if (row?.totp_secret) return row.totp_secret;
  const secret = createSecret();
  await db.run("UPDATE users SET totp_secret = ? WHERE id = ? AND totp_secret IS NULL", [
    secret,
    userId,
  ]);
  const again = await db.get<{ totp_secret: string }>(
    "SELECT totp_secret FROM users WHERE id = ?",
    [userId],
  );
  return again?.totp_secret ?? secret;
}

async function finishLogin(userId: number, secret: string, username: string, rawCode: string) {
  const code = parseCode(rawCode.replace(/\D/g, ""));
  if (code === null || !verifyTotp(secret, username, String(code).padStart(6, "0"))) {
    return false;
  }
  await claimDailyFreebie(userId, code);
  return true;
}

async function databaseBlock(): Promise<AuthState | null> {
  const message = await databaseMessage();
  return message ? { error: message } : null;
}

export async function registerAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const factor = String(formData.get("factor") ?? "password");
  const blocked = await databaseBlock();
  if (blocked) return blocked;
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  if (emailError || passwordError) {
    return {
      emailError: emailError ?? undefined,
      passwordError: passwordError ?? undefined,
    };
  }
  if (factor !== "password" && factor !== "authenticator" && factor !== "email") {
    return { error: "Choose a password, an authenticator app, or email." };
  }
  if (factor === "email" && emailDelivery() === "unavailable") {
    return { error: EMAIL_SENDER_MISSING };
  }

  const db = await getDb();
  const existing = await db.get<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return { emailError: "That email already has a card." };

  const username = await unusedUsername(db, usernameFromGoogle({ email, sub: email }));
  const passwordHash = await hashPassword(password);
  if (factor === "password") {
    const result = await db.run(
      "INSERT INTO users (username, password_hash, totp_confirmed, totp_login, email_login, email) VALUES (?, ?, 0, 0, 0, ?)",
      [username, passwordHash, email],
    );
    const token = await createSession(result.lastInsertRowid);
    redirect(`/board?session=${token}`);
  }

  if (factor === "email") {
    const result = await db.run(
      "INSERT INTO users (username, password_hash, totp_confirmed, totp_login, email_login, email) VALUES (?, ?, 0, 0, 1, ?)",
      [username, passwordHash, email],
    );
    const userId = Number(result.lastInsertRowid);
    const issued = await deliverEmailCode(userId, email);
    if (!issued.ok) {
      await db.run("DELETE FROM users WHERE id = ?", [userId]);
      return { error: issued.error };
    }
    redirect(`/login/email?ticket=${issued.ticket}`);
  }

  const secret = createSecret();
  const result = await db.run(
    "INSERT INTO users (username, password_hash, totp_secret, totp_confirmed, totp_login, email_login, email) VALUES (?, ?, ?, 0, 1, 0, ?)",
    [username, passwordHash, secret, email],
  );
  const ticket = await beginPending(Number(result.lastInsertRowid), "enroll");
  redirect(`/setup?ticket=${ticket}`);
}

export async function loginAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const identity = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identity || !password) {
    return { error: "Enter your email and password." };
  }
  const blocked = await databaseBlock();
  if (blocked) return blocked;

  const db = await getDb();
  const row = identity.includes("@")
    ? await db.get<LoginRow>(
        `SELECT id, password_hash, totp_secret, totp_confirmed, totp_login, email_login, email
         FROM users WHERE email = ?`,
        [normalizeEmail(identity)],
      )
    : await db.get<LoginRow>(
        `SELECT id, password_hash, totp_secret, totp_confirmed, totp_login, email_login, email
         FROM users WHERE username = ?`,
        [identity],
      );
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    return { error: "Those details don’t match an account." };
  }

  if (Number(row.totp_login) === 1) {
    if (!row.totp_secret || Number(row.totp_confirmed) !== 1) {
      await ensureSecret(Number(row.id));
      const ticket = await beginPending(Number(row.id), "enroll");
      redirect(`/setup?ticket=${ticket}`);
    }
    const ticket = await beginPending(Number(row.id), "login");
    redirect(`/login/code?ticket=${ticket}`);
  }

  if (Number(row.email_login) === 1) {
    if (!row.email) return { error: "This account asks for an email code, but no address is saved." };
    const issued = await deliverEmailCode(Number(row.id), String(row.email));
    if (!issued.ok) return { error: issued.error };
    redirect(`/login/email?ticket=${issued.ticket}`);
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

  const user = await loadUser(userId);
  if (!user) redirect("/login");
  const secret = await ensureSecret(user.id);
  const raw = String(formData.get("code") ?? "");
  const digits = raw.replace(/\D/g, "");
  if (!verifyTotp(secret, user.username, digits)) {
    return { error: "That code doesn’t match. Wait for a fresh one and try again." };
  }

  const db = await getDb();
  await db.run("UPDATE users SET totp_confirmed = 1, totp_login = 1, email_login = 0 WHERE id = ?", [user.id]);
  await clearEmailChallenge(user.id);
  const code = parseCode(digits);
  if (code !== null) await claimDailyFreebie(user.id, code);
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
  const user = await loadUser(pending.userId);
  if (!user?.totp_secret || Number(user.totp_confirmed) !== 1) redirect("/setup");

  const digits = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (!(await finishLogin(user.id, user.totp_secret, user.username, digits))) {
    return { error: "That code doesn’t match. Wait for a fresh one and try again." };
  }
  await clearPending(pending.token);
  const token = await createSession(user.id);
  redirect(`/board?session=${token}`);
}

export async function emailCodeAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const ticket = String(formData.get("ticket") ?? "");
  const pending = await readPending(ticket);
  if (!pending || pending.purpose !== "login") redirect("/login");
  const result = await checkEmailCode(pending.userId, String(formData.get("code") ?? ""));
  if (result === "expired") return { error: "That code has expired. Send another." };
  if (result === "locked") return { error: "Too many tries. Send another code." };
  if (result !== "ok") return { error: "That code doesn’t match." };

  const digits = String(formData.get("code") ?? "").replace(/\D/g, "");
  const code = parseCode(digits);
  if (code !== null) await claimDailyFreebie(pending.userId, code);
  await clearPending(pending.token);
  const token = await createSession(pending.userId);
  redirect(`/board?session=${token}`);
}

export async function resendEmailCodeAction(formData: FormData): Promise<void> {
  const ticket = String(formData.get("ticket") ?? "");
  const pending = await readPending(ticket);
  if (!pending || pending.purpose !== "login") redirect("/login");
  const db = await getDb();
  const row = await db.get<{ email: string | null; email_login: number }>(
    "SELECT email, email_login FROM users WHERE id = ?",
    [pending.userId],
  );
  if (!row?.email || Number(row.email_login) !== 1) redirect("/login");
  const issued = await deliverEmailCode(pending.userId, String(row.email));
  if (!issued.ok) {
    const notice = issued.error.startsWith("Wait") ? "wait" : "send";
    redirect(`/login/email?ticket=${pending.token}&notice=${notice}`);
  }
  redirect(`/login/email?ticket=${issued.ticket}`);
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
  const db = await getDb();
  await db.run("UPDATE users SET totp_login = 0, email_login = 0 WHERE id = ?", [userId]);
  await clearEmailChallenge(userId);
  await clearPending(pending?.token ?? ticket);
  if (session) await destroySession(session.token);
  const token = await createSession(userId);
  redirect(`/board?session=${token}`);
}

export async function setFactorAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const sessionToken = String(formData.get("session") ?? "");
  const user = await readSessionUser(sessionToken);
  if (!user) redirect("/login");
  const factor = String(formData.get("factor") ?? "");
  const db = await getDb();

  if (factor === "password") {
    await db.run("UPDATE users SET totp_login = 0, email_login = 0 WHERE id = ?", [user.id]);
    await clearEmailChallenge(user.id);
    redirect(`/board?session=${user.token}`);
  }

  if (factor === "authenticator") {
    if (user.totpConfirmed) {
      await db.run("UPDATE users SET totp_login = 1, email_login = 0 WHERE id = ?", [user.id]);
      await clearEmailChallenge(user.id);
      redirect(`/board?session=${user.token}`);
    }
    await ensureSecret(user.id);
    const ticket = await beginPending(user.id, "enroll");
    redirect(`/setup?ticket=${ticket}`);
  }

  if (factor === "email") {
    let email = user.email ? normalizeEmail(user.email) : "";
    const typed = normalizeEmail(String(formData.get("accountEmail") ?? ""));
    if (!email && typed) {
      const emailError = validateEmail(typed);
      if (emailError) return { error: emailError };
      const taken = await db.get<{ id: number }>(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [typed, user.id],
      );
      if (taken) return { error: "That email already has a card." };
      await db.run("UPDATE users SET email = ? WHERE id = ?", [typed, user.id]);
      email = typed;
    }
    if (!email) return { error: "Add the email address the code should go to." };
    if (emailDelivery() === "unavailable") return { error: EMAIL_SENDER_MISSING };
    await db.run("UPDATE users SET totp_login = 0, email_login = 1 WHERE id = ?", [user.id]);
    redirect(`/board?session=${user.token}`);
  }

  return { error: "Choose a password, an authenticator app, or email." };
}

export async function logoutAction(formData: FormData): Promise<void> {
  await destroySession(String(formData.get("session") ?? ""));
  await clearPending();
  redirect("/");
}
