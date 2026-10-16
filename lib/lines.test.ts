import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { closestLine, lineFill, newlyCompleteLines } from "./lines";

describe("lines of ten", () => {
  it("starts on the first unfinished line", () => {
    const closest = closestLine(lineFill([]));
    assert.equal(closest.start, 0);
    assert.equal(closest.filled, 0);
    assert.equal(closest.label, "000000 to 000010");
  });

  it("skips a finished line for the next fuller one", () => {
    const marks: [number, number][] = [];
    for (let code = 0; code < 10; code += 1) marks.push([code, 1]);
    marks.push([10, 1], [11, 1], [12, 1]);
    const lines = lineFill(marks);
    const closest = closestLine(lines);
    assert.equal(closest.start, 10);
    assert.equal(closest.filled, 3);
    assert.equal(closest.label, "000010 to 000020");
    const before = lineFill(marks.slice(0, 10));
    assert.deepEqual(newlyCompleteLines(before, lines), []);
    const after = lineFill([...marks, [13, 1], [14, 1], [15, 1], [16, 1], [17, 1], [18, 1], [19, 1]]);
    assert.deepEqual(newlyCompleteLines(lines, after), ["000010 to 000020"]);
  });

  it("counts a column and both diagonals", () => {
    const down = Array.from({ length: 10 }, (_, row) => [row * 10, 1] as [number, number]);
    const almost = lineFill(down.slice(0, 9));
    assert.equal(closestLine(almost).label, "000000 down to 000090");
    assert.equal(closestLine(almost).filled, 9);
    assert.deepEqual(newlyCompleteLines(almost, lineFill(down)), ["000000 down to 000090"]);

    const main = Array.from({ length: 9 }, (_, step) => [step * 10 + step, 1] as [number, number]);
    const anti = Array.from({ length: 9 }, (_, step) => [step * 10 + (9 - step), 1] as [number, number]);
    assert.equal(closestLine(lineFill(main)).label, "000000 diagonal to 000099");
    assert.equal(closestLine(lineFill(anti)).label, "000009 diagonal to 000090");
  });
});
