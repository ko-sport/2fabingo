import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyze } from "./bingo";
import { extractCodes, makeCode, parseCode, splitCode } from "./codes";

function row(
  card: number,
  index: number,
  marks: Map<number, number>,
  count = 1,
) {
  for (let col = 0; col < 100; col++) {
    marks.set(makeCode(card, index, col), count);
  }
}

function card(index: number, marks: Map<number, number>) {
  for (let r = 0; r < 100; r++) row(index, r, marks);
}

describe("codes", () => {
  it("splits a code into card, row, and column", () => {
    assert.deepEqual(splitCode(250417), { card: 25, row: 4, col: 17 });
    assert.deepEqual(splitCode(0), { card: 0, row: 0, col: 0 });
    assert.deepEqual(splitCode(999999), { card: 99, row: 99, col: 99 });
    assert.equal(makeCode(25, 4, 17), 250417);
  });

  it("extracts six-digit runs", () => {
    assert.deepEqual(extractCodes("250417"), ["250417"]);
    assert.deepEqual(extractCodes("250417, 000001\n999999"), [
      "250417",
      "000001",
      "999999",
    ]);
    assert.equal(parseCode("12345"), null);
    assert.equal(parseCode("1234567"), null);
  });
});

describe("analyze", () => {
  it("starts empty", () => {
    const result = analyze([]);
    assert.equal(result.filled, 0);
    assert.equal(result.miniLines.length, 0);
    assert.equal(result.fiveStacks.length, 0);
    assert.equal(result.houses.length, 0);
    assert.equal(result.fullLines.length, 0);
    assert.equal(result.twoFullLines.length, 0);
    assert.equal(result.fullHouse, false);
    assert.equal(result.closestRow, null);
  });

  it("counts repeats as one square and a deeper daub", () => {
    const result = analyze([[250417, 4]]);
    assert.equal(result.filled, 1);
    assert.equal(result.totalDaubs, 4);
    assert.equal(result.cards[25].filled, 1);
    assert.equal(result.miniLines.length, 0);
  });

  it("needs all 100 columns for a mini-line", () => {
    const marks = new Map<number, number>();
    for (let col = 0; col < 99; col++) marks.set(makeCode(4, 12, col), 1);
    assert.equal(analyze(marks).miniLines.length, 0);
    marks.set(makeCode(4, 12, 99), 2);
    const result = analyze(marks);
    assert.deepEqual(result.miniLines, [{ card: 4, row: 12 }]);
    assert.equal(result.fiveStacks.length, 0);
    assert.equal(result.closestRow, null);
  });

  it("ignores a filled column", () => {
    const marks = new Map<number, number>();
    for (let r = 0; r < 100; r++) marks.set(makeCode(0, r, 0), 1);
    const result = analyze(marks);
    assert.equal(result.miniLines.length, 0);
    assert.equal(result.filled, 100);
  });

  it("calls five consecutive rows and treats a gap as a break", () => {
    const marks = new Map<number, number>();
    for (let r = 10; r <= 13; r++) row(2, r, marks);
    assert.equal(analyze(marks).fiveStacks.length, 0);
    row(2, 14, marks);
    const five = analyze(marks);
    assert.deepEqual(five.fiveStacks, [{ card: 2, start: 10, length: 5 }]);

    const gapped = new Map<number, number>();
    for (const r of [0, 1, 3, 4, 5]) row(0, r, gapped);
    assert.equal(analyze(gapped).fiveStacks.length, 0);
    assert.equal(analyze(gapped).miniLines.length, 5);
  });

  it("keeps a longer run as one five-stack", () => {
    const marks = new Map<number, number>();
    for (let r = 0; r < 8; r++) row(7, r, marks);
    assert.deepEqual(analyze(marks).fiveStacks, [
      { card: 7, start: 0, length: 8 },
    ]);
  });

  it("calls a mini-house when the card is full", () => {
    const marks = new Map<number, number>();
    card(8, marks);
    const result = analyze(marks);
    assert.deepEqual(result.houses, [8]);
    assert.equal(result.cards[8].house, true);
    assert.equal(result.miniLines.length, 100);
    assert.deepEqual(result.fiveStacks, [{ card: 8, start: 0, length: 100 }]);
    assert.equal(result.fullLines.length, 0);
  });

  it("calls a full line from ten houses in a band", () => {
    const marks = new Map<number, number>();
    for (let c = 0; c < 10; c++) card(c, marks);
    const result = analyze(marks);
    assert.deepEqual(result.fullLines, [0]);
    assert.equal(result.twoFullLines.length, 0);
    assert.equal(result.houses.length, 10);
  });

  it("calls a double line only when the bands touch", () => {
    const marks = new Map<number, number>();
    for (let c = 0; c < 10; c++) card(c, marks);
    for (let c = 20; c < 30; c++) card(c, marks);
    const split = analyze(marks);
    assert.deepEqual(split.fullLines, [0, 2]);
    assert.equal(split.twoFullLines.length, 0);

    for (let c = 10; c < 20; c++) card(c, marks);
    const together = analyze(marks);
    assert.deepEqual(together.fullLines, [0, 1, 2]);
    assert.deepEqual(together.twoFullLines, [{ start: 0, length: 3 }]);
  });

  it("calls a full house at one million squares", () => {
    const marks = new Map<number, number>();
    for (let code = 0; code < 1_000_000; code++) marks.set(code, 1);
    const result = analyze(marks);
    assert.equal(result.fullHouse, true);
    assert.equal(result.houses.length, 100);
    assert.equal(result.fullLines.length, 10);
    assert.deepEqual(result.twoFullLines, [{ start: 0, length: 10 }]);
    assert.equal(result.filled, 1_000_000);
    assert.equal(result.closestRow, null);
    assert.equal(result.closestHouse, null);
  });

  it("tracks the closest unfinished row", () => {
    const marks = new Map<number, number>();
    for (let col = 0; col < 40; col++) marks.set(makeCode(3, 2, col), 1);
    for (let col = 0; col < 70; col++) marks.set(makeCode(1, 9, col), 1);
    row(1, 0, marks);
    const result = analyze(marks);
    assert.deepEqual(result.closestRow, { card: 1, row: 9, filled: 70 });
  });
});
