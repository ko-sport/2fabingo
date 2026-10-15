import { Suspense } from "react";
import Link from "next/link";
import { AuthNav } from "@/components/auth-nav";
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
            One million squares. One grid at a time.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#3d5246]">
            Type a code and the card opens on that hundred. Click the square to
            register it. Or start from the full set and click inward: 10,000
            codes, then a hundred, then the number.
          </p>
          <div className="mt-8">
            <Suspense fallback={<div className="h-11 w-48" />}>
              <AuthNav prominent />
            </Suspense>
          </div>

          <ol className="mt-10 grid gap-3">
            {[
              ["The set", "100 squares, from 000000–010000 to 990000–1000000."],
              ["A block", "100 pages of a hundred codes, 000000–000100 onward."],
              ["A hundred", "The exact numbers. Click one to register it."],
            ].map(([name, summary], index) => (
              <li key={name} className="ticket rounded-xl px-4 py-3">
                <p className="font-heading text-lg leading-none text-[#14211b]">
                  <span className="mr-2 font-mono text-xs text-[#6b7f72]">0{index + 1}</span>
                  {name}
                </p>
                <p className="mt-1 text-sm text-[#4d6156]">{summary}</p>
              </li>
            ))}
          </ol>
        </div>
        <SampleCard />
      </main>

      <section className="ticket mb-8 rounded-2xl p-5 sm:p-6">
        <h2 className="font-heading text-2xl">Where a code sits</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#4d6156]">
          250417 is inside 250000–260000, then inside 250400–250500, then it is
          the square itself. Find opens that hundred. The click registers it.
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
