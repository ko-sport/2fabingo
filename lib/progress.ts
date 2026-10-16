import { formatCode } from "@/lib/codes";
import { spanLabel } from "@/lib/zoom";

export type ClosestSpan = {
  start: number;
  end: number;
  filled: number;
  total: number;
  /** Set when the line is not one contiguous run of codes. */
  label?: string;
};

export type HundredLine = {
  id: number;
  label: string;
  filled: number;
  start: number;
  end: number;
};

export type ProgressSnapshot = {
  /** Completed lines of ten 100s, across, down, and on both diagonals. */
  lines: number;
  hundred: ClosestSpan;
  line: ClosestSpan;
  block: ClosestSpan;
  bingoFilled: number;
  bingoTotal: number;
};

function closer(current: ClosestSpan, next: ClosestSpan): ClosestSpan {
  const currentDone = current.filled >= current.total;
  const nextDone = next.filled >= next.total;
  if (nextDone && !currentDone) return current;
  if (!nextDone && currentDone) return next;
  const currentRatio = current.filled / current.total;
  const nextRatio = next.filled / next.total;
  if (nextRatio > currentRatio) return next;
  if (nextRatio === currentRatio && next.start < current.start) return next;
  return current;
}

function linesInBlock(pageFill: ArrayLike<number>, blockIndex: number): HundredLine[] {
  const blockStart = blockIndex * 10_000;
  const pages = Array.from({ length: 100 }, (_, page) => pageFill[blockIndex * 100 + page] ?? 0);
  const lines: HundredLine[] = [];

  for (let row = 0; row < 10; row += 1) {
    let filled = 0;
    for (let column = 0; column < 10; column += 1) filled += pages[row * 10 + column] ?? 0;
    const start = blockStart + row * 1_000;
    lines.push({
      id: start,
      label: spanLabel(start, start + 1_000),
      filled,
      start,
      end: start + 1_000,
    });
  }

  for (let column = 0; column < 10; column += 1) {
    let filled = 0;
    for (let row = 0; row < 10; row += 1) filled += pages[row * 10 + column] ?? 0;
    const start = blockStart + column * 100;
    const end = blockStart + 9_000 + column * 100;
    lines.push({
      id: 1_000_000 + blockIndex * 10 + column,
      label: `${formatCode(start)} down to ${formatCode(end)}`,
      filled,
      start,
      end,
    });
  }

  let main = 0;
  let anti = 0;
  for (let step = 0; step < 10; step += 1) {
    main += pages[step * 10 + step] ?? 0;
    anti += pages[step * 10 + (9 - step)] ?? 0;
  }
  lines.push({
    id: 2_000_000 + blockIndex,
    label: `${formatCode(blockStart)} diagonal to ${formatCode(blockStart + 9_900)}`,
    filled: main,
    start: blockStart,
    end: blockStart + 9_900,
  });
  lines.push({
    id: 3_000_000 + blockIndex,
    label: `${formatCode(blockStart + 900)} diagonal to ${formatCode(blockStart + 9_000)}`,
    filled: anti,
    start: blockStart + 900,
    end: blockStart + 9_000,
  });
  return lines;
}

/** Finished lines of ten 100s, including columns and both diagonals. */
export function completedHundredLines(pageFill: ArrayLike<number>): HundredLine[] {
  const done: HundredLine[] = [];
  for (let blockIndex = 0; blockIndex < 100; blockIndex += 1) {
    for (const line of linesInBlock(pageFill, blockIndex)) {
      if (line.filled >= 1_000) done.push(line);
    }
  }
  return done;
}

export function progressSnapshot(
  pageFill: ArrayLike<number>,
  blockFill: ArrayLike<number>,
  bingoFilled: number,
): ProgressSnapshot {
  let hundred: ClosestSpan = { start: 0, end: 100, filled: 0, total: 100 };
  let line: ClosestSpan = { start: 0, end: 1_000, filled: 0, total: 1_000 };
  let block: ClosestSpan = { start: 0, end: 10_000, filled: 0, total: 10_000 };
  let lines = 0;

  for (let blockIndex = 0; blockIndex < 100; blockIndex += 1) {
    const blockStart = blockIndex * 10_000;
    const filled = blockFill[blockIndex] ?? 0;
    block = closer(block, {
      start: blockStart,
      end: blockStart + 10_000,
      filled,
      total: 10_000,
    });

    for (let page = 0; page < 100; page += 1) {
      const pageFilled = pageFill[blockIndex * 100 + page] ?? 0;
      const start = blockStart + page * 100;
      hundred = closer(hundred, {
        start,
        end: start + 100,
        filled: pageFilled,
        total: 100,
      });
    }

    for (const item of linesInBlock(pageFill, blockIndex)) {
      if (item.filled >= 1_000) lines += 1;
      line = closer(line, {
        start: item.start,
        end: item.end,
        filled: item.filled,
        total: 1_000,
        ...(item.id >= 1_000_000 ? { label: item.label } : {}),
      });
    }
  }

  return {
    lines,
    hundred,
    line,
    block,
    bingoFilled,
    bingoTotal: 1_000_000,
  };
}

export function spanPercent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.min(filled, total) / total) * 100);
}
