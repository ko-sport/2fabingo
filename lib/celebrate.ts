import { shareCard, setPercentLabel } from "@/lib/share";
import { spanLabel } from "@/lib/zoom";
import { newlyCompleteLines } from "@/lib/lines";

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

function thousandStarts(pageFill: ArrayLike<number>): number[] {
  const starts: number[] = [];
  for (let block = 0; block < 100; block += 1) {
    for (let row = 0; row < 10; row += 1) {
      let sum = 0;
      for (let column = 0; column < 10; column += 1) {
        sum += pageFill[block * 100 + row * 10 + column] ?? 0;
      }
      if (sum >= 1_000) starts.push(block * 10_000 + row * 1_000);
    }
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

  for (const start of newlyCompleteLines(beforeLines, afterLines)) {
    events.push(shareCard(`I completed a line! ${spanLabel(start, start + 10)}`, 10, 10));
  }
  for (const start of added(hundredStarts(before.pageFill), hundredStarts(after.pageFill))) {
    events.push(shareCard(`I completed a 100! ${spanLabel(start, start + 100)}`, 100, 100));
  }
  for (const start of added(thousandStarts(before.pageFill), thousandStarts(after.pageFill))) {
    events.push(shareCard(`I completed a line of 100s! ${spanLabel(start, start + 1_000)}`, 1_000, 1_000));
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
