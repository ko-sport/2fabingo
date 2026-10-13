import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/wordmark";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Log in" lede="Opening the door to your card.">
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
  if (user) redirect("/board");
  return (
    <AuthShell
      title="Log in"
      lede="Your squares are saved to this account."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}

function AuthShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <Link href="/" className="text-2xl text-[#f4efe4]">
        <Wordmark />
      </Link>
      <div className="paper-card mt-10 rounded-2xl p-6">
        <h1 className="font-heading text-4xl">{title}</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">{lede}</p>
        {children}
      </div>
    </div>
  );
}
