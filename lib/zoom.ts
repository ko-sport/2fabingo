import { formatCode } from "@/lib/codes";

export function blockIndex(code: number): number {
  return Math.floor(code / 10_000);
}

export function pageIndex(code: number): number {
  return Math.floor((code % 10_000) / 100);
}

export function cellIndex(code: number): number {
  return code % 100;
}

export function blockStart(block: number): number {
  return block * 10_000;
}

export function pageStart(block: number, page: number): number {
  return block * 10_000 + page * 100;
}

export function cellCode(block: number, page: number, cell: number): number {
  return block * 10_000 + page * 100 + cell;
}

/** Exclusive end of a span. The last code in the set is written 1000000. */
export function spanEnd(endExclusive: number): string {
  return endExclusive === 1_000_000 ? "1000000" : formatCode(endExclusive);
}

export function spanLabel(start: number, endExclusive: number): string {
  return `${formatCode(start)}–${spanEnd(endExclusive)}`;
}
