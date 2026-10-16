import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export type SignInFactor = "password" | "authenticator" | "email";

export const EMAIL_CODE_MS = 10 * 60 * 1000;
export const EMAIL_CODE_ATTEMPTS = 5;

export function createEmailCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashEmailCode(code: string, userId: number): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

export function emailCodeMatches(hash: string, code: string, userId: number): boolean {
  const next = hashEmailCode(code, userId);
  const left = Buffer.from(hash);
  const right = Buffer.from(next);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email.slice(0, 1)}•••${email.slice(at)}`;
}
