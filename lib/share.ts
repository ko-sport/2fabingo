const CELLS = 10;

export function progressBar(filled: number, total: number): string {
  if (total <= 0) return "⬜".repeat(CELLS);
  const ratio = Math.min(1, Math.max(0, filled / total));
  const greens = Math.round(ratio * CELLS);
  return `${"🟩".repeat(greens)}${"⬜".repeat(CELLS - greens)}`;
}

/** 1,000 registered squares is 0.1% of the million. */
export function setPercentLabel(filled: number): string {
  const tenths = Math.floor(filled / 1_000);
  const percent = tenths / 10;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

export function shareCard(headline: string, filled: number, total: number, percent?: string): {
  headline: string;
  bar: string;
  text: string;
} {
  const blocks = progressBar(filled, total);
  const bar = percent ? `${blocks} ${percent}` : blocks;
  return {
    headline,
    bar,
    text: `2FA Bingo\n${headline}\n${bar}`,
  };
}
