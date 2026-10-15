import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { getOptionalUser } from "@/lib/auth";
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
  if (user?.totpConfirmed) redirect("/board");
  if (user) redirect("/setup");
  return (
    <AuthShell
      title="Log in"
      lede="Password first. Then the six digits from your authenticator — that code is today’s free square."
    >
      <AuthForm mode="login" action={loginAction} />
    </AuthShell>
  );
}
