import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closestLine, lineFill, newlyCompleteLines } from "./lines";

describe("lines of ten", () => {
  it("starts on the first unfinished line", () => {
    const closest = closestLine(lineFill([]));
    assert.deepEqual(closest, { start: 0, filled: 0 });
  });

  it("skips a finished line for the next fuller one", () => {
    const marks: [number, number][] = [];
    for (let code = 0; code < 10; code += 1) marks.push([code, 1]);
    marks.push([10, 1], [11, 1], [12, 1]);
    const lines = lineFill(marks);
    assert.deepEqual(closestLine(lines), { start: 10, filled: 3 });
    const before = lineFill(marks.slice(0, 10));
    assert.deepEqual(newlyCompleteLines(before, lines), []);
    const after = lineFill([...marks, [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1]]);
    assert.deepEqual(newlyCompleteLines(lines, after), [10]);
  });
});
