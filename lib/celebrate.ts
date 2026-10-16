import { newlyCompleteLines } from "@/lib/lines";
import { completedHundredLines } from "@/lib/progress";
import { shareCard, setPercentLabel } from "@/lib/share";
import { spanLabel } from "@/lib/zoom";

export type Celebration = {
  headline: string;
  bar: string;
  text: string;
};

type Snapshot = {
  filled: number;
  pageFill: ArrayLike<number>;
  houses: number[];
  fullHouse: boolean;
};

function hundredStarts(pageFill: ArrayLike<number>): number[] {
  const starts: number[] = [];
  for (let index = 0; index < pageFill.length; index += 1) {
    if ((pageFill[index] ?? 0) >= 100) starts.push(index * 100);
  }
  return starts;
}

function added(before: number[], after: number[]): number[] {
  const seen = new Set(before);
  return after.filter((start) => !seen.has(start));
}

export function celebrate(
  before: Snapshot,
  after: Snapshot,
  beforeLines: Uint8Array,
  afterLines: Uint8Array,
): Celebration[] {
  const events: Celebration[] = [];

  for (const label of newlyCompleteLines(beforeLines, afterLines)) {
    events.push(shareCard(`I completed a line! ${label}`, 10, 10));
  }
  for (const start of added(hundredStarts(before.pageFill), hundredStarts(after.pageFill))) {
    events.push(shareCard(`I completed a 100! ${spanLabel(start, start + 100)}`, 100, 100));
  }
  const seenLines = new Set(completedHundredLines(before.pageFill).map((line) => line.id));
  for (const line of completedHundredLines(after.pageFill)) {
    if (seenLines.has(line.id)) continue;
    events.push(shareCard(`I completed a line of 100s! ${line.label}`, 1_000, 1_000));
  }
  for (const block of added(before.houses, after.houses)) {
    const start = block * 10_000;
    events.push(shareCard(`I completed 10,000! ${spanLabel(start, start + 10_000)}`, 10_000, 10_000));
  }
  if (!before.fullHouse && after.fullHouse) {
    events.push(shareCard("I completed the whole set! 000000 to 1000000", 1_000_000, 1_000_000));
  } else if (Math.floor(after.filled / 1_000) > Math.floor(before.filled / 1_000)) {
    const percent = setPercentLabel(after.filled);
    events.push(
      shareCard(`I’m ${percent} of the way to the whole set!`, after.filled, 1_000_000, percent),
    );
  }

  return events;
}
