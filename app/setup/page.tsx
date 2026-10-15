import { Suspense } from "react";
import { redirect } from "next/navigation";
import { enrollAction } from "@/app/actions/auth";
import { readPending, readSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createSecret, formatSecret, qrDataUrl } from "@/lib/totp";
import { AuthShell } from "@/components/auth-shell";
import { TotpForm } from "@/components/totp-form";

type Search = { ticket?: string | string[] };

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function SetupPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Pair an app" lede="Preparing the QR code.">
          <div className="h-64" />
        </AuthShell>
      }
    >
      <SetupGate searchParams={searchParams} />
    </Suspense>
  );
}

function ensureSecret(userId: number): { username: string; secret: string } {
  const db = getDb();
  const row = db
    .prepare("SELECT username, totp_secret FROM users WHERE id = ?")
    .get(userId) as { username: string; totp_secret: string | null } | undefined;
  if (!row) redirect("/login");
  if (row.totp_secret) return { username: row.username, secret: row.totp_secret };
  const secret = createSecret();
  db.prepare(
    "UPDATE users SET totp_secret = ? WHERE id = ? AND totp_secret IS NULL",
  ).run(secret, userId);
  const again = db
    .prepare("SELECT totp_secret FROM users WHERE id = ?")
    .get(userId) as { totp_secret: string };
  return { username: row.username, secret: again.totp_secret };
}

async function SetupGate({ searchParams }: { searchParams: Promise<Search> }) {
  const ticket = firstParam((await searchParams).ticket);
  const session = await readSessionUser();
  const pending = await readPending(ticket);
  if (session?.totpConfirmed) redirect("/board");

  const userId =
    session && !session.totpConfirmed
      ? session.id
      : pending?.purpose === "enroll"
        ? pending.userId
        : null;
  if (userId === null) redirect("/login");

  const { username, secret } = ensureSecret(userId);
  const qr = await qrDataUrl(secret, username);

  return (
    <AuthShell
      title="Pair an app"
      lede={`Add 2FA Bingo to an authenticator for ${username}. The first code you enter is daubed on the card.`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt="QR code for the authenticator app"
        width={220}
        height={220}
        className="mx-auto rounded-xl border border-[#c5d6c9] bg-white p-2"
      />
      <p className="mt-4 text-sm text-[#4d6156]">
        Or type this secret by hand.
      </p>
      <p
        className="mt-1 font-mono text-sm tracking-[0.12em] break-all text-[#14211b]"
        data-testid="totp-secret"
      >
        {formatSecret(secret)}
      </p>
      <div className="mt-6">
        <TotpForm
          action={enrollAction}
          ticket={pending?.token ?? ""}
          submit="Confirm and open the card"
          hint="Enter the six digits the app is showing right now."
        />
      </div>
    </AuthShell>
  );
}
