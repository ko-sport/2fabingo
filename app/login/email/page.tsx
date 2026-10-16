import { Suspense } from "react";
import { redirect } from "next/navigation";
import { emailCodeAction, passwordOnlyAction, resendEmailCodeAction } from "@/app/actions/auth";
import { readPending } from "@/lib/auth";
import { challengeKind, emailChallenge } from "@/lib/email-signin";
import { maskEmail } from "@/lib/email-code";
import { AuthShell } from "@/components/auth-shell";
import { blockedDatabase } from "@/components/database-notice";
import { TotpForm } from "@/components/totp-form";

type Search = { ticket?: string | string[]; notice?: string | string[] };

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function EmailCodePage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Code from your email" lede="Waiting for the six digits.">
          <div className="h-40" />
        </AuthShell>
      }
    >
      <EmailGate searchParams={searchParams} />
    </Suspense>
  );
}

async function EmailGate({ searchParams }: { searchParams: Promise<Search> }) {
  const blocked = await blockedDatabase();
  if (blocked) return blocked;
  const params = await searchParams;
  const ticket = firstParam(params.ticket);
  const pending = await readPending(ticket);
  if (!pending || pending.purpose !== "login") redirect("/login");
  const kind = await challengeKind(pending.userId);
  if (kind === "authenticator") redirect(`/login/code?ticket=${pending.token}`);
  if (kind !== "email") redirect("/login");
  const challenge = await emailChallenge(pending.userId);
  if (!challenge) redirect("/login");
  const notice = firstParam(params.notice);

  return (
    <AuthShell
      title="Code from your email"
      lede={`Check ${maskEmail(challenge.email)} for a 6-digit code. It lasts 10 minutes. The first code that works each day is daubed.`}
    >
      {challenge.preview ? (
        <p
          data-testid="dev-email-code"
          className="mb-4 rounded-lg bg-[#e5f6eb] px-3 py-2 text-sm text-[#0f5c36]"
        >
          No mail is leaving this machine. The code is{" "}
          <span className="font-mono tracking-wide">{challenge.preview}</span>.
        </p>
      ) : null}
      {notice === "wait" ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          Wait a moment before sending another.
        </p>
      ) : null}
      {notice === "send" ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          The code didn’t send. Try again in a moment.
        </p>
      ) : null}
      <TotpForm
        action={emailCodeAction}
        ticket={pending.token}
        submit="Open the card"
        hint="Six digits from the message."
      />
      <form action={resendEmailCodeAction} className="mt-4">
        <input type="hidden" name="ticket" value={pending.token} />
        <button type="submit" className="text-sm text-[#1f7a45] underline underline-offset-2">
          Send another code
        </button>
      </form>
      <form action={passwordOnlyAction} className="mt-3">
        <input type="hidden" name="ticket" value={pending.token} />
        <button type="submit" className="text-sm text-[#1f7a45] underline underline-offset-2">
          Use a password only
        </button>
      </form>
    </AuthShell>
  );
}
