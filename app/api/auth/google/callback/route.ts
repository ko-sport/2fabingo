import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { unusedUsername } from "@/lib/account-name";
import { getDb } from "@/lib/db";
import { finishGoogleState, googleProfile, googleRedirectUri } from "@/lib/google";
import { usernameFromGoogle } from "@/lib/google-username";
import { hashPassword } from "@/lib/passwords";

type Account = {
  id: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sentState = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const denied = url.searchParams.get("error") === "access_denied";
  const stateOk = await finishGoogleState(sentState);
  if (denied || !stateOk || !code) {
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }

  try {
    const profile = await googleProfile(code, googleRedirectUri(request));
    if (!profile.emailVerified) {
      return NextResponse.redirect(new URL("/login?error=google", request.url));
    }
    const account = await accountForGoogle(profile);
    const token = await createSession(account.id);
    return NextResponse.redirect(new URL(`/board?session=${token}`, request.url));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }
}

async function accountForGoogle(profile: {
  sub: string;
  email: string;
  name: string;
}): Promise<Account> {
  const db = await getDb();
  const existing = await db.get<Account>("SELECT id FROM users WHERE google_sub = ?", [profile.sub]);
  if (existing) return existing;

  const username = await unusedUsername(db, usernameFromGoogle(profile));
  const passwordHash = await hashPassword(randomBytes(32).toString("hex"));
  const result = await db.run(
    `INSERT INTO users (username, password_hash, totp_confirmed, totp_login, email_login, google_sub, email)
     VALUES (?, ?, 0, 0, 0, ?, ?)`,
    [username, passwordHash, profile.sub, profile.email.toLowerCase()],
  );
  return { id: Number(result.lastInsertRowid) };
}
