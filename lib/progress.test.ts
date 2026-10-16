import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { progressSnapshot } from "./progress";
import { spanLabel } from "./zoom";

describe("progress", () => {
  it("starts every range at the first codes", () => {
    const snapshot = progressSnapshot(new Uint16Array(10_000), new Uint32Array(100), 0);
    assert.equal(snapshot.lines, 0);
    assert.equal(spanLabel(snapshot.hundred.start, snapshot.hundred.end), "000000 to 000100");
    assert.equal(spanLabel(snapshot.line.start, snapshot.line.end), "000000 to 001000");
    assert.equal(spanLabel(snapshot.block.start, snapshot.block.end), "000000 to 010000");
    assert.equal(snapshot.bingoTotal, 1_000_000);
  });

  it("picks the fullest unfinished range, and the earlier one when they match", () => {
    const pages = new Uint16Array(10_000);
    pages[1] = 40;
    pages[2] = 40;
    pages[20] = 90;
    const blocks = new Uint32Array(100);
    blocks[0] = 130;
    blocks[3] = 500;
    const snapshot = progressSnapshot(pages, blocks, 630);
    assert.equal(snapshot.hundred.start, 2_000);
    assert.equal(snapshot.hundred.filled, 90);
    assert.equal(snapshot.block.start, 30_000);
    assert.equal(snapshot.lines, 0);
  });

  it("counts a finished column and diagonal of ten 100s", () => {
    const down = new Uint16Array(10_000);
    for (let row = 0; row < 10; row += 1) down[row * 10] = 100;
    const downSnapshot = progressSnapshot(down, new Uint32Array(100), 1_000);
    assert.equal(downSnapshot.lines, 1);
    assert.equal(downSnapshot.line.label, undefined);

    const diagonal = new Uint16Array(10_000);
    for (let step = 0; step < 10; step += 1) diagonal[step * 10 + step] = 100;
    const diagonalSnapshot = progressSnapshot(diagonal, new Uint32Array(100), 1_000);
    assert.equal(diagonalSnapshot.lines, 1);

    const column = new Uint16Array(10_000);
    for (let row = 0; row < 10; row += 1) column[row * 10 + 1] = 80;
    const columnSnapshot = progressSnapshot(column, new Uint32Array(100), 800);
    assert.equal(columnSnapshot.line.label, "000100 down to 009100");
    assert.equal(columnSnapshot.line.filled, 800);
  });

  it("counts a finished line of ten 100s", () => {
    const pages = new Uint16Array(10_000);
    for (let page = 10; page < 20; page += 1) pages[page] = 100;
    const blocks = new Uint32Array(100);
    blocks[0] = 1_000;
    const snapshot = progressSnapshot(pages, blocks, 1_000);
    assert.equal(snapshot.lines, 1);
    assert.equal(snapshot.line.label, "000000 down to 009000");
    assert.equal(snapshot.line.filled, 100);
    assert.equal(snapshot.hundred.start, 0);
    assert.equal(snapshot.hundred.filled, 0);
  });
});
