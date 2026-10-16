"use server";

import { redirect } from "next/navigation";
import { clearPending, createSession, destroySession, readSessionUser, renewSession } from "@/lib/auth";
import { databaseMessage, getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { unusedUsername } from "@/lib/account-name";
import { usernameFromGoogle } from "@/lib/google-username";
import { normalizeEmail, validateEmail, validatePassword, validateUsername } from "@/lib/validators";

export type AuthState = {
  error?: string;
  emailError?: string;
  passwordError?: string;
};

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

  const db = await getDb();
  const existing = await db.get<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return { emailError: "That email already has a card." };

  const username = await unusedUsername(db, usernameFromGoogle({ email, sub: email }));
  const passwordHash = await hashPassword(password);
  const result = await db.run(
    "INSERT INTO users (username, password_hash, totp_confirmed, totp_login, email_login, email) VALUES (?, ?, 0, 0, 0, ?)",
    [username, passwordHash, email],
  );
  const token = await createSession(result.lastInsertRowid);
  redirect(`/board?session=${token}`);
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
    ? await db.get<{ id: number; password_hash: string }>(
        "SELECT id, password_hash FROM users WHERE email = ?",
        [normalizeEmail(identity)],
      )
    : await db.get<{ id: number; password_hash: string }>(
        "SELECT id, password_hash FROM users WHERE username = ?",
        [identity],
      );
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    return { error: "Those details don’t match an account." };
  }

  const token = await createSession(Number(row.id));
  redirect(`/board?session=${token}`);
}

export type RenameState = { error?: string; username?: string };

export async function renameAction(_state: RenameState, formData: FormData): Promise<RenameState> {
  const sessionToken = String(formData.get("session") ?? "");
  const user = await readSessionUser(sessionToken);
  if (!user) redirect("/login");
  const username = String(formData.get("username") ?? "").trim();
  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (username.toLowerCase() === user.username.toLowerCase()) return { username: user.username };
  const db = await getDb();
  const taken = await db.get<{ id: number }>("SELECT id FROM users WHERE username = ? AND id != ?", [
    username,
    user.id,
  ]);
  if (taken) return { error: "That name is already on a card." };
  await db.run("UPDATE users SET username = ? WHERE id = ?", [username, user.id]);
  return { username };
}

export async function touchSessionAction(sessionToken: string): Promise<void> {
  await renewSession(sessionToken);
}

export async function logoutAction(formData: FormData): Promise<void> {
  await destroySession(String(formData.get("session") ?? ""));
  await clearPending();
  redirect("/");
}
