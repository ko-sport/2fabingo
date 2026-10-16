import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { celebrate } from "./celebrate";
import { lineFill } from "./lines";

function snap(filled: number, pages: number[] = []): {
  filled: number;
  pageFill: number[];
  houses: number[];
  fullHouse: boolean;
} {
  const pageFill = Array.from({ length: 10_000 }, (_, index) => pages[index] ?? 0);
  return { filled, pageFill, houses: [], fullHouse: filled >= 1_000_000 };
}

describe("celebrations", () => {
  it("announces a finished line of ten", () => {
    const before = lineFill([[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1]]);
    const after = lineFill([...Array.from({ length: 9 }, (_, code) => [code, 1] as [number, number]), [9, 1]]);
    const events = celebrate(snap(9), snap(10), before, after);
    assert.equal(events[0]?.headline, "I completed a line! 000000 to 000010");
    assert.match(events[0]?.text ?? "", /🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩/);
  });

  it("announces each extra tenth of a percent", () => {
    const empty = lineFill([]);
    const events = celebrate(snap(999), snap(1_000), empty, empty);
    assert.equal(events.at(-1)?.headline, "I’m 0.1% of the way to the whole set!");
    assert.match(events.at(-1)?.bar ?? "", /0\.1%$/);
  });
});
