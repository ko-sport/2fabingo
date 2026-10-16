import { NextResponse } from "next/server";
import { beginGoogle, googleAuthUrl, googleConfigured, googleRedirectUri } from "@/lib/google";

export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google-setup", request.url));
  }
  const secure = forwardedProto(request) === "https";
  const { state } = await beginGoogle(secure);
  const response = NextResponse.redirect(googleAuthUrl(googleRedirectUri(request), state));
  response.cookies.set("bingo_google", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}

function forwardedProto(request: Request): string {
  return (
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")
  )
    .split(",")[0]
    ?.trim()
    .toLowerCase();
}
