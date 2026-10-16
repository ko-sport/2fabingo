const LINE_COUNT = 100_000;

export function lineFill(counts: Iterable<[number, number]>): Uint8Array {
  const lines = new Uint8Array(LINE_COUNT);
  for (const [code, count] of counts) {
    if (count <= 0 || !Number.isInteger(code) || code < 0 || code >= 1_000_000) continue;
    lines[Math.floor(code / 10)] += 1;
  }
  return lines;
}

export function closestLine(lines: Uint8Array): { start: number; filled: number } {
  let bestStart = 0;
  let bestFilled = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const filled = lines[index] ?? 0;
    if (filled >= 10) continue;
    if (filled > bestFilled) {
      bestFilled = filled;
      bestStart = index * 10;
    }
  }
  if (bestFilled < 0) return { start: 999_990, filled: 10 };
  return { start: bestStart, filled: bestFilled };
}

export function newlyCompleteLines(before: Uint8Array, after: Uint8Array): number[] {
  const starts: number[] = [];
  const length = Math.min(before.length, after.length);
  for (let index = 0; index < length; index += 1) {
    if ((before[index] ?? 0) < 10 && (after[index] ?? 0) >= 10) starts.push(index * 10);
  }
  return starts;
}
