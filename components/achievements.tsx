"use client";

import { useAnalysis } from "@/components/card-store";
import { blockStart, pageStart, spanLabel } from "@/lib/zoom";

function completePages(pageFill: Uint16Array, block: number) {
  let count = 0;
  const base = block * 100;
  for (let index = 0; index < 100; index++) {
    if (pageFill[base + index] === 100) count += 1;
  }
  return count;
}

function Meter({
  label,
  detail,
  value,
  max,
}: {
  label: string;
  detail: string;
  value: number;
  max: number;
}) {
  const width = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-lg leading-none text-[#14211b]">{label}</h3>
        <p className="font-mono text-[11px] text-[#4d6156]">
          {value.toLocaleString()} / {max.toLocaleString()}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d7e6dc]">
        <div className="h-full rounded-full bg-[#1b6b45]" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-[#4d6156]">{detail}</p>
    </div>
  );
}

export function Achievements({
  block,
  page,
}: {
  block: number | null;
  page: number | null;
}) {
  const analysis = useAnalysis();
  const started = analysis.cards.filter((card) => card.filled > 0).length;
  const blockFilled = block === null ? 0 : (analysis.cards[block]?.filled ?? 0);
  const pagesDone = block === null ? 0 : completePages(analysis.pageFill, block);
  const pageFilled =
    block === null || page === null ? 0 : (analysis.pageFill[block * 100 + page] ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-xl text-[#14211b]">Progress</h2>
        <p className="mt-1 text-sm text-[#4d6156]">
          Three views of the same million. A square goes greener as more of its
          numbers are registered.
        </p>
      </div>
      <Meter
        label="The whole set"
        value={analysis.filled}
        max={1_000_000}
        detail={`${started} of 100 blocks have a code. ${analysis.houses.length} ${analysis.houses.length === 1 ? "block is" : "blocks are"} complete.`}
      />
      <Meter
        label="This 10,000"
        value={blockFilled}
        max={10_000}
        detail={
          block === null
            ? "Open a square on the set. Each one holds 10,000 codes."
            : `${spanLabel(blockStart(block), blockStart(block) + 10_000)}. ${pagesDone} of 100 hundreds are complete.`
        }
      />
      <Meter
        label="This hundred"
        value={pageFilled}
        max={100}
        detail={
          block === null || page === null
            ? "Open a square in a block. Each one is a hundred exact codes."
            : `${spanLabel(pageStart(block, page), pageStart(block, page) + 100)}. Register a code again and its square goes darker.`
        }
      />
    </div>
  );
}
