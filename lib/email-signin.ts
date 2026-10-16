import "server-only";
import { beginPending } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  EMAIL_CODE_ATTEMPTS,
  EMAIL_CODE_MS,
  createEmailCode,
  emailCodeMatches,
  hashEmailCode,
} from "@/lib/email-code";
import { mayPreviewEmailCode, sendSignInCode } from "@/lib/mail";

export type EmailChallenge = {
  email: string;
  preview: string | null;
};

export async function challengeKind(
  userId: number,
): Promise<"authenticator" | "email" | "password"> {
  const db = await getDb();
  const row = await db.get<{ totp_login: number; email_login: number }>(
    "SELECT totp_login, email_login FROM users WHERE id = ?",
    [userId],
  );
  if (!row) return "password";
  if (Number(row.totp_login) === 1) return "authenticator";
  if (Number(row.email_login) === 1) return "email";
  return "password";
}

export async function emailChallenge(userId: number): Promise<EmailChallenge | null> {
  const db = await getDb();
  const row = await db.get<{ email: string | null; preview: string | null }>(
    "SELECT email, email_code_preview AS preview FROM users WHERE id = ?",
    [userId],
  );
  if (!row?.email) return null;
  return { email: String(row.email), preview: row.preview ? String(row.preview) : null };
}

export async function clearEmailChallenge(userId: number): Promise<void> {
  const db = await getDb();
  await db.run(
    `UPDATE users
     SET email_code_hash = NULL, email_code_expires = NULL,
         email_code_attempts = 0, email_code_preview = NULL
     WHERE id = ?`,
    [userId],
  );
}

export async function deliverEmailCode(
  userId: number,
  email: string,
): Promise<{ ok: true; ticket: string } | { ok: false; error: string }> {
  const db = await getDb();
  const pending = await db.get<{ expires: number | null }>(
    "SELECT email_code_expires AS expires FROM users WHERE id = ?",
    [userId],
  );
  if (pending?.expires && Number(pending.expires) > Date.now() + EMAIL_CODE_MS - 30_000) {
    return { ok: false, error: "Wait a moment before sending another." };
  }

  const code = createEmailCode();
  const sent = await sendSignInCode(email, code);
  if (!sent.ok) return sent;

  await db.run(
    `UPDATE users
     SET email_code_hash = ?, email_code_expires = ?, email_code_attempts = 0, email_code_preview = ?
     WHERE id = ?`,
    [hashEmailCode(code, userId), Date.now() + EMAIL_CODE_MS, mayPreviewEmailCode() ? code : null, userId],
  );
  const ticket = await beginPending(userId, "login");
  return { ok: true, ticket };
}

export async function checkEmailCode(
  userId: number,
  raw: string,
): Promise<"ok" | "mismatch" | "expired" | "locked"> {
  const digits = raw.replace(/\D/g, "");
  const db = await getDb();
  const row = await db.get<{ hash: string | null; expires: number | null; attempts: number }>(
    `SELECT email_code_hash AS hash, email_code_expires AS expires, email_code_attempts AS attempts
     FROM users WHERE id = ?`,
    [userId],
  );
  if (!row?.hash || row.expires === null || Number(row.expires) < Date.now()) {
    await clearEmailChallenge(userId);
    return "expired";
  }
  if (!/^\d{6}$/.test(digits) || !emailCodeMatches(String(row.hash), digits, userId)) {
    const attempts = Number(row.attempts) + 1;
    if (attempts >= EMAIL_CODE_ATTEMPTS) {
      await clearEmailChallenge(userId);
      return "locked";
    }
    await db.run("UPDATE users SET email_code_attempts = ? WHERE id = ?", [attempts, userId]);
    return "mismatch";
  }
  await clearEmailChallenge(userId);
  return "ok";
}
