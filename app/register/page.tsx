import { Suspense } from "react";
import { registerAction } from "@/app/actions/auth";
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

export default function RegisterPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Start a card" lede="Setting a place for your squares.">
          <div className="h-48" />
        </AuthShell>
      }
    >
      <RegisterGate searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterGate({ searchParams }: { searchParams: Promise<Search> }) {
  const blocked = await blockedDatabase();
  if (blocked) return blocked;
  const user = await getOptionalUser();
  redirectSignedIn(user);
  const error = firstParam((await searchParams).error);
  return (
    <AuthShell
      title="Start a card"
      lede={`Stay signed in for ${SESSION_DAYS} days. Choose 2FA via an authenticator app or email, or just a password.`}
    >
      <GoogleSignIn from="register" />
      <AuthForm mode="register" action={registerAction} notice={googleNotice(error)} />
    </AuthShell>
  );
}
