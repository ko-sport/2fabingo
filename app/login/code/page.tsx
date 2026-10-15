import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loginCodeAction } from "@/app/actions/auth";
import { readPending } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { TotpForm } from "@/components/totp-form";

export default function LoginCodePage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Authenticator" lede="Waiting for the six digits.">
          <div className="h-40" />
        </AuthShell>
      }
    >
      <CodeGate />
    </Suspense>
  );
}

async function CodeGate() {
  const pending = await readPending();
  if (!pending || pending.purpose !== "login") redirect("/login");
  return (
    <AuthShell
      title="Today’s code"
      lede={`Signing in as ${pending.username}. The first code that works each day is daubed for free.`}
    >
      <TotpForm
        action={loginCodeAction}
        submit="Open the card"
        hint="It changes every 30 seconds. A code from the previous or next step still counts."
      />
    </AuthShell>
  );
}
