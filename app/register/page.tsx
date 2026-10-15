import { Suspense } from "react";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions/auth";
import { getOptionalUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

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
  const user = await getOptionalUser();
  if (user?.totpConfirmed) redirect("/board");
  if (user) redirect("/setup");
  return (
    <AuthShell
      title="Start a card"
      lede="Pick a username and password. Next you’ll pair an authenticator, and the code that confirms it is your first free square."
    >
      <AuthForm mode="register" action={registerAction} />
    </AuthShell>
  );
}
