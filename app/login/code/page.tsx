import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loginCodeAction, passwordOnlyAction } from "@/app/actions/auth";
import { readPending } from "@/lib/auth";
import { challengeKind } from "@/lib/email-signin";
import { AuthShell } from "@/components/auth-shell";
import { blockedDatabase } from "@/components/database-notice";
import { TotpForm } from "@/components/totp-form";

type Search = { ticket?: string | string[] };

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function LoginCodePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Authenticator" lede="Waiting for the six digits.">
          <div className="h-40" />
        </AuthShell>
      }
    >
      <CodeGate searchParams={searchParams} />
    </Suspense>
  );
}

async function CodeGate({ searchParams }: { searchParams: Promise<Search> }) {
  const blocked = await blockedDatabase();
  if (blocked) return blocked;
  const ticket = firstParam((await searchParams).ticket);
  const pending = await readPending(ticket);
  if (!pending || pending.purpose !== "login") redirect("/login");
  const kind = await challengeKind(pending.userId);
  if (kind === "email") redirect(`/login/email?ticket=${pending.token}`);
  if (kind !== "authenticator") redirect("/login");
  return (
    <AuthShell
      title="Today’s code"
      lede={`Signing in as ${pending.username}. The first code that works each day is daubed for free.`}
    >
      <TotpForm
        action={loginCodeAction}
        ticket={pending.token}
        submit="Open the card"
        hint="It changes every 30 seconds. A code from the previous or next step still counts."
      />
      <form action={passwordOnlyAction} className="mt-4">
        <input type="hidden" name="ticket" value={pending.token} />
        <button type="submit" className="text-sm text-[#1f7a45] underline underline-offset-2">
          Sign in with the password only
        </button>
      </form>
    </AuthShell>
  );
}
