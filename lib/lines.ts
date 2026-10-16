import { formatCode } from "@/lib/codes";
import { spanLabel } from "@/lib/zoom";

const HUNDREDS = 10_000;
const PER_HUNDRED = 22;

export type TenLine = { start: number; filled: number; label: string };

export function lineFill(counts: Iterable<[number, number]>): Uint8Array {
  const lines = new Uint8Array(HUNDREDS * PER_HUNDRED);
  for (const [code, count] of counts) {
    if (count <= 0 || !Number.isInteger(code) || code < 0 || code >= 1_000_000) continue;
    const cell = code % 100;
    const row = Math.floor(cell / 10);
    const column = cell % 10;
    const base = Math.floor(code / 100) * PER_HUNDRED;
    lines[base + row] += 1;
    lines[base + 10 + column] += 1;
    if (row === column) lines[base + 20] += 1;
    if (row + column === 9) lines[base + 21] += 1;
  }
  return lines;
}

export function lineLabel(index: number): TenLine {
  const hundred = Math.floor(index / PER_HUNDRED);
  const kind = index % PER_HUNDRED;
  const origin = hundred * 100;
  if (kind < 10) {
    const start = origin + kind * 10;
    return { start, filled: 0, label: spanLabel(start, start + 10) };
  }
  if (kind < 20) {
    const start = origin + (kind - 10);
    return { start, filled: 0, label: `${formatCode(start)} down to ${formatCode(start + 90)}` };
  }
  if (kind === 20) {
    return {
      start: origin,
      filled: 0,
      label: `${formatCode(origin)} diagonal to ${formatCode(origin + 99)}`,
    };
  }
  return {
    start: origin + 9,
    filled: 0,
    label: `${formatCode(origin + 9)} diagonal to ${formatCode(origin + 90)}`,
  };
}

export function closestLine(lines: Uint8Array): TenLine {
  let bestIndex = 0;
  let bestFilled = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const filled = lines[index] ?? 0;
    if (filled >= 10) continue;
    if (filled > bestFilled) {
      bestFilled = filled;
      bestIndex = index;
    }
  }
  if (bestFilled < 0) {
    const last = lineLabel(lines.length - 1);
    return { ...last, filled: 10 };
  }
  return { ...lineLabel(bestIndex), filled: bestFilled };
}

export function newlyCompleteLines(before: Uint8Array, after: Uint8Array): string[] {
  const labels: string[] = [];
  const length = Math.min(before.length, after.length);
  for (let index = 0; index < length; index += 1) {
    if ((before[index] ?? 0) < 10 && (after[index] ?? 0) >= 10) labels.push(lineLabel(index).label);
  }
  return labels;
}
