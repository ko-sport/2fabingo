import { Suspense } from "react";
import { loginAction } from "@/app/actions/auth";
import { getOptionalUser, redirectSignedIn } from "@/lib/auth";
import { SESSION_DAYS } from "@/lib/session";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Log in" lede="Checking the door to your card.">
          <div className="h-48" />
        </AuthShell>
      }
    >
      <LoginGate />
    </Suspense>
  );
}

async function LoginGate() {
  const user = await getOptionalUser();
  redirectSignedIn(user);
  return (
    <AuthShell
      title="Log in"
      lede={`You stay signed in for ${SESSION_DAYS} days. If authenticator sign-in is on, the next step is the six-digit code, and that code is marked once each day.`}
    >
      <AuthForm mode="login" action={loginAction} />
    </AuthShell>
  );
}
