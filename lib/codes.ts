export const CARD_COUNT = 100;
export const GRID_SIZE = 100;
export const CELLS_PER_CARD = GRID_SIZE * GRID_SIZE;
export const CODE_COUNT = CARD_COUNT * CELLS_PER_CARD;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatCode(code: number): string {
  return String(code).padStart(6, "0");
}

export type CodeParts = {
  card: number;
  row: number;
  col: number;
};

/** ABCDEF → card AB, row CD, column EF. */
export function splitCode(code: number): CodeParts {
  const card = Math.floor(code / 10_000);
  const within = code % 10_000;
  return {
    card,
    row: Math.floor(within / 100),
    col: within % 100,
  };
}

export function makeCode(card: number, row: number, col: number): number {
  return card * 10_000 + row * 100 + col;
}

export function metaRowOf(card: number): number {
  return Math.floor(card / 10);
}

export function metaColOf(card: number): number {
  return card % 10;
}

const SINGLE_CODE = /^\d{6}$/;

export function parseCode(input: string): number | null {
  const trimmed = input.trim();
  if (!SINGLE_CODE.test(trimmed)) return null;
  return Number(trimmed);
}

/** Pull every 6-digit run out of typed or pasted text. */
export function extractCodes(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (SINGLE_CODE.test(trimmed)) return [trimmed];
  return trimmed.match(/\d{6}/g) ?? [];
}

export function bandLabel(metaRow: number): string {
  const start = metaRow * 10;
  return `cards ${pad2(start)}–${pad2(start + 9)}`;
}
