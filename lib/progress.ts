export type ClosestSpan = {
  start: number;
  end: number;
  filled: number;
  total: number;
};

export type ProgressSnapshot = {
  /** Completed lines of ten hundreds (1,000 codes each). */
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

    for (let row = 0; row < 10; row += 1) {
      let rowFilled = 0;
      for (let column = 0; column < 10; column += 1) {
        const page = row * 10 + column;
        const pageFilled = pageFill[blockIndex * 100 + page] ?? 0;
        rowFilled += pageFilled;
        const start = blockStart + page * 100;
        hundred = closer(hundred, {
          start,
          end: start + 100,
          filled: pageFilled,
          total: 100,
        });
      }
      const start = blockStart + row * 1_000;
      if (rowFilled >= 1_000) lines += 1;
      line = closer(line, {
        start,
        end: start + 1_000,
        filled: rowFilled,
        total: 1_000,
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
