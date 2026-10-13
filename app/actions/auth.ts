"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { validatePassword, validateUsername } from "@/lib/validators";

export type AuthState = {
  error?: string;
  usernameError?: string;
  passwordError?: string;
};

export async function registerAction(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
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
  const result = getDb()
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(username, passwordHash);
  await createSession(Number(result.lastInsertRowid));
  redirect("/board");
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
    .prepare("SELECT id, password_hash FROM users WHERE username = ?")
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    return { error: "Those details don’t match an account." };
  }
  await createSession(Number(row.id));
  redirect("/board");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
