"use server";

import { readSessionUser } from "@/lib/auth";
import { parseCode } from "@/lib/codes";
import {
  applyGrouped,
  listMarks,
  listRecent,
  replaceMarks,
} from "@/lib/marks-data";

const MAX_ENTRIES = 2_000;

export type DaubEntry = { code: string; delta: number };

function groupEntries(entries: DaubEntry[]): Map<number, number> | string {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "Enter a 6-digit code.";
  }
  if (entries.length > MAX_ENTRIES) {
    return `Daub up to ${MAX_ENTRIES.toLocaleString()} codes at a time.`;
  }
  const grouped = new Map<number, number>();
  for (const entry of entries) {
    const code = parseCode(String(entry?.code ?? ""));
    const delta = Number(entry?.delta);
    if (code === null) return "Enter a 6-digit code.";
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100) {
      return "That daub couldn’t be saved.";
    }
    grouped.set(code, (grouped.get(code) ?? 0) + delta);
  }
  return grouped;
}

export async function daubManyAction(
  entries: DaubEntry[],
  sessionToken?: string,
): Promise<{ counts: [number, number][] } | { error: string }> {
  const user = await readSessionUser(sessionToken);
  if (!user) return { error: "Log in again to keep daubing." };
  const grouped = groupEntries(entries);
  if (typeof grouped === "string") return { error: grouped };
  try {
    return { counts: applyGrouped(user.id, grouped) };
  } catch {
    return { error: "Couldn’t save that daub." };
  }
}

export async function reloadMarksAction(
  sessionToken?: string,
): Promise<
  | { marks: [number, number][]; recent: { code: number; count: number }[] }
  | { error: string }
> {
  const user = await readSessionUser(sessionToken);
  if (!user) return { error: "Log in again to keep daubing." };
  return { marks: listMarks(user.id), recent: listRecent(user.id) };
}

export async function importMarksAction(
  marks: [number, number][],
  sessionToken?: string,
): Promise<{ total: number } | { error: string }> {
  const user = await readSessionUser(sessionToken);
  if (!user) return { error: "Log in again to import a card." };
  if (!Array.isArray(marks) || marks.length > 1_000_000) {
    return { error: "That file isn’t a bingo card." };
  }
  const clean: [number, number][] = [];
  const seen = new Set<number>();
  for (const entry of marks) {
    if (!Array.isArray(entry) || entry.length < 2) {
      return { error: "That file isn’t a bingo card." };
    }
    const code = Number(entry[0]);
    const count = Number(entry[1]);
    if (!Number.isInteger(code) || code < 0 || code > 999999) {
      return { error: "That file isn’t a bingo card." };
    }
    if (!Number.isFinite(count) || count < 1 || seen.has(code)) continue;
    seen.add(code);
    clean.push([code, Math.min(9999, Math.floor(count))]);
  }
  try {
    replaceMarks(user.id, clean);
  } catch {
    return { error: "Couldn’t import that card." };
  }
  return { total: clean.length };
}
