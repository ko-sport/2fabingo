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
        <Link href="/" className="text-2xl text-[#f4efe4]">
          <Wordmark />
        </Link>
        <Suspense fallback={<div className="h-9 w-40" />}>
          <AuthNav />
        </Suspense>
      </header>

      <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:py-16">
        <div>
          <p className="font-mono text-xs tracking-[0.22em] text-[#c47b14] uppercase">
            A card for codes
          </p>
          <h1 className="mt-3 max-w-xl font-heading text-5xl leading-[0.95] text-[#f4efe4] sm:text-6xl">
            One million squares. Six ways to call it.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#d9cbb3]">
            Every six-digit code you get through the day, from 000000 to 999999,
            has a square. Type it, or open its card and click. Come back later
            and the green is still there.
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
                className="flex items-center gap-3 rounded-xl border border-[#3a3228] bg-[#1c1712]/70 px-3 py-2"
              >
                <CallGlyph kind={call.glyph} />
                <div>
                  <p className="font-heading text-lg leading-none text-[#f4efe4]">
                    <span className="mr-2 font-mono text-xs text-[#8d8376]">
                      0{index + 1}
                    </span>
                    {call.name}
                  </p>
                  <p className="mt-1 text-sm text-[#b7ad9e]">{call.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <SampleCard />
      </main>

      <section className="paper-card mb-8 rounded-2xl p-5 sm:p-6">
        <h2 className="font-heading text-2xl">Where a code sits</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#5c5348]">
          The wall is 100 cards, 00 to 99, ten across. Each card is 100 rows by
          100 columns. A code reads as card, row, column.
        </p>
        <p className="mt-4 font-mono text-3xl tracking-[0.22em] sm:text-4xl">
          <span className="text-[#c47b14]">25</span>
          <span className="text-[#1f7a45]">04</span>
          <span className="text-[#1c1712]">17</span>
        </p>
        <p className="mt-2 font-mono text-xs tracking-wide text-[#6e6458] uppercase">
          <span className="text-[#c47b14]">Card</span>
          {" · "}
          <span className="text-[#1f7a45]">Row</span>
          {" · "}
          <span className="text-[#1c1712]">Column</span>
        </p>
      </section>
    </div>
  );
}
