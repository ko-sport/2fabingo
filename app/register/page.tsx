import { Suspense } from "react";
import { registerAction } from "@/app/actions/auth";
import { getOptionalUser, redirectSignedIn } from "@/lib/auth";
import { SESSION_DAYS } from "@/lib/session";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { blockedDatabase } from "@/components/database-notice";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Start a card" lede="Setting a place for your squares.">
          <div className="h-48" />
        </AuthShell>
      }
    >
      <RegisterGate />
    </Suspense>
  );
}

async function RegisterGate() {
  const blocked = await blockedDatabase();
  if (blocked) return blocked;
  const user = await getOptionalUser();
  redirectSignedIn(user);
  return (
    <AuthShell
      title="Start a card"
      lede={`Pick a username and password. You stay signed in for ${SESSION_DAYS} days. An authenticator is optional.`}
    >
      <AuthForm mode="register" action={registerAction} />
    </AuthShell>
  );
}
