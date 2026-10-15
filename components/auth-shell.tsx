import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function AuthShell({
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
      <Link href="/" className="text-2xl text-[#14211b]">
        <Wordmark />
      </Link>
      <div className="ticket mt-8 rounded-2xl p-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-[#1f7a45] uppercase">
          Authenticator required
        </p>
        <h1 className="mt-2 font-heading text-4xl text-[#14211b]">{title}</h1>
        <p className="mt-2 mb-6 text-sm text-[#4d6156]">{lede}</p>
        {children}
      </div>
    </div>
  );
}
