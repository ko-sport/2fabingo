"use client";

import { useAnalysis } from "@/components/card-store";
import { progressSnapshot, spanPercent } from "@/lib/progress";
import { spanLabel } from "@/lib/zoom";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-[#4d6156]">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm text-[#14211b]">{value}</dd>
    </div>
  );
}

export function Achievements() {
  const analysis = useAnalysis();
  const snapshot = progressSnapshot(
    analysis.pageFill,
    analysis.cards.map((card) => card.filled),
    analysis.filled,
  );
  const hundred = `${spanLabel(snapshot.hundred.start, snapshot.hundred.end)} - ${spanPercent(snapshot.hundred.filled, snapshot.hundred.total)}%`;
  const line = `${spanLabel(snapshot.line.start, snapshot.line.end)} - ${spanPercent(snapshot.line.filled, snapshot.line.total)}%`;
  const block = `${spanLabel(snapshot.block.start, snapshot.block.end)} - ${spanPercent(snapshot.block.filled, snapshot.block.total)}%`;
  const bingo = `${snapshot.bingoFilled.toLocaleString()} / ${snapshot.bingoTotal.toLocaleString()} - ${spanPercent(snapshot.bingoFilled, snapshot.bingoTotal)}%`;

  return (
    <div data-testid="progress">
      <h2 className="font-heading text-xl text-[#14211b]">Keep track of your progress!</h2>
      <p className="mt-3 text-sm text-[#14211b]" data-testid="line-count">
        Number of lines: {snapshot.lines.toLocaleString()}
      </p>
      <dl className="mt-4 flex flex-col gap-3">
        <Row label="Closest 100 to completion" value={hundred} />
        <Row label="Closest line of hundreds to completion" value={line} />
        <Row label="Closest 10,000 to completion" value={block} />
        <Row label="Bingo" value={bingo} />
      </dl>
    </div>
  );
}
