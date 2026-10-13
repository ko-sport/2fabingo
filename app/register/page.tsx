import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { Wordmark } from "@/components/wordmark";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-md px-5 py-8">
          <p className="font-heading text-3xl text-[#f4efe4]">Start a card</p>
        </div>
      }
    >
      <RegisterGate />
    </Suspense>
  );
}

async function RegisterGate() {
  const user = await getOptionalUser();
  if (user) redirect("/board");
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <Link href="/" className="text-2xl text-[#f4efe4]">
        <Wordmark />
      </Link>
      <div className="paper-card mt-10 rounded-2xl p-6">
        <h1 className="font-heading text-4xl">Start a card</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Pick a username. The million squares wait under it, and they stay
          when you come back.
        </p>
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
