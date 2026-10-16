import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const STATE = "bingo_google";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function googleRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const proto = (request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))
    .split(",")[0]
    ?.trim();
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host)
    .split(",")[0]
    ?.trim();
  return `${proto}://${host}/api/auth/google/callback`;
}

export async function beginGoogle(secure: boolean): Promise<{ state: string }> {
  const state = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set(STATE, state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return { state };
}

export async function finishGoogleState(received: string): Promise<boolean> {
  const jar = await cookies();
  const saved = jar.get(STATE)?.value ?? "";
  jar.set(STATE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  if (!/^[a-f0-9]{64}$/.test(saved) || !/^[a-f0-9]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(saved), Buffer.from(received));
}

export function googleAuthUrl(redirectUri: string, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID?.trim() ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export async function googleProfile(code: string, redirectUri: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenResponse.ok) throw new Error("Google token exchange failed");
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Google token exchange failed");
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) throw new Error("Google profile request failed");
  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!profile.sub || !profile.email) throw new Error("Google profile was incomplete");
  return {
    sub: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified === true,
    name: profile.name ?? "",
  };
}
