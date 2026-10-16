import { Suspense } from "react";
import { loginAction } from "@/app/actions/auth";
import { getOptionalUser, redirectSignedIn } from "@/lib/auth";
import { SESSION_DAYS } from "@/lib/session";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { blockedDatabase } from "@/components/database-notice";
import { GoogleSignIn } from "@/components/google-button";
import { googleConfigured } from "@/lib/google";

type Search = { error?: string | string[] };

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function googleNotice(error: string): string | undefined {
  if (error === "google-setup") {
    return "Google sign-in still needs a client ID and secret on the host.";
  }
  if (error === "google") return "Google sign-in didn’t finish. Try again.";
  return undefined;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Log in" lede="Checking the door to your card.">
          <div className="h-48" />
        </AuthShell>
      }
    >
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginGate({ searchParams }: { searchParams: Promise<Search> }) {
  const blocked = await blockedDatabase();
  if (blocked) return blocked;
  const user = await getOptionalUser();
  redirectSignedIn(user);
  const error = firstParam((await searchParams).error);
  return (
    <AuthShell
      title="Log in"
      lede={`You stay signed in for ${SESSION_DAYS} days. Use Google, or a username and password. Nothing is emailed. An authenticator app is optional, and only that code is marked once each day.`}
    >
      <GoogleSignIn enabled={googleConfigured()} />
      <AuthForm mode="login" action={loginAction} notice={googleNotice(error)} />
    </AuthShell>
  );
}
