/** SQLite stores `datetime('now')` as UTC without a zone. */
export function parseMarkedAt(value: string): Date {
  const trimmed = value.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return new Date(trimmed);
  return new Date(`${trimmed.replace(" ", "T")}Z`);
}

/** Day the mark was saved, in the viewer’s local calendar. 15 October 2026 is 15/10/26. */
export function formatMarkDay(value: string | Date): string {
  const date = value instanceof Date ? value : parseMarkedAt(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}
