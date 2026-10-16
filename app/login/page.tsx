import { Suspense } from "react";
import { loginAction } from "@/app/actions/auth";
import { getOptionalUser, redirectSignedIn } from "@/lib/auth";
import { SESSION_DAYS } from "@/lib/session";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { blockedDatabase } from "@/components/database-notice";
import { GoogleSignIn, googleNotice } from "@/components/google-button";

type Search = { error?: string | string[] };

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
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
      lede={`Stay signed in for ${SESSION_DAYS} days. Choose an authenticator app, a code emailed to you, or just a password.`}
    >
      <GoogleSignIn />
      <AuthForm mode="login" action={loginAction} notice={googleNotice(error)} />
    </AuthShell>
  );
}
