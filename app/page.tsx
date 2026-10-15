import { Suspense } from "react";
import Link from "next/link";
import { CALLS } from "@/lib/calls";
import { AuthNav } from "@/components/auth-nav";
import { CallGlyph } from "@/components/call-glyph";
import { SampleCard } from "@/components/sample-card";
import { Wordmark } from "@/components/wordmark";

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-2xl text-[#14211b]">
          <Wordmark />
        </Link>
        <Suspense fallback={<div className="h-9 w-40" />}>
          <AuthNav />
        </Suspense>
      </header>

      <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:py-16">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-[#1f7a45] uppercase">
            A card for codes
          </p>
          <h1 className="mt-3 max-w-xl font-heading text-5xl leading-[0.95] text-[#10241c] sm:text-6xl">
            One million squares. One free code a day.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#3d5246]">
            Sign in with an authenticator. The six digits that let you in are
            daubed for you, once each day. Every other code you collect, from
            000000 to 999999, has a square too.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-11 w-48" />}>
              <AuthNav prominent />
            </Suspense>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2">
            {CALLS.map((call, index) => (
              <li
                key={call.id}
                className="ticket flex items-center gap-3 rounded-xl px-3 py-2"
              >
                <CallGlyph kind={call.glyph} />
                <div>
                  <p className="font-heading text-lg leading-none text-[#14211b]">
                    <span className="mr-2 font-mono text-xs text-[#6b7f72]">
                      0{index + 1}
                    </span>
                    {call.name}
                  </p>
                  <p className="mt-1 text-sm text-[#4d6156]">{call.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <SampleCard />
      </main>

      <section className="ticket mb-8 rounded-2xl p-5 sm:p-6">
        <h2 className="font-heading text-2xl">Where a code sits</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#4d6156]">
          The wall is 100 cards, 00 to 99, ten across. Each card is 100 rows by
          100 columns. A code reads as card, row, column. The code you use to
          log in lands on that square the first time you sign in each day.
        </p>
        <p className="mt-4 font-mono text-3xl tracking-[0.22em] sm:text-4xl">
          <span className="text-[#c47b14]">25</span>
          <span className="text-[#1f7a45]">04</span>
          <span className="text-[#14211b]">17</span>
        </p>
        <p className="mt-2 font-mono text-xs tracking-wide text-[#6b7f72] uppercase">
          <span className="text-[#c47b14]">Card</span>
          {" · "}
          <span className="text-[#1f7a45]">Row</span>
          {" · "}
          <span className="text-[#14211b]">Column</span>
        </p>
      </section>
    </div>
  );
}
