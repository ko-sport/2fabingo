import type { CallId } from "@/lib/bingo";

export type GlyphKind = "line" | "five" | "house" | "full" | "double" | "all";

export const CALLS: {
  id: CallId;
  name: string;
  summary: string;
  glyph: GlyphKind;
}[] = [
  {
    id: "mini-line",
    name: "Mini-line",
    summary: "100 squares in a single row of one card.",
    glyph: "line",
  },
  {
    id: "five-stack",
    name: "Five-stack",
    summary: "Five mini-lines, one under the next, on the same card.",
    glyph: "five",
  },
  {
    id: "mini-house",
    name: "Mini-house",
    summary: "All 10,000 squares on one card.",
    glyph: "house",
  },
  {
    id: "full-line",
    name: "Full line",
    summary: "All ten cards in a horizontal band, each one a mini-house.",
    glyph: "full",
  },
  {
    id: "double-line",
    name: "Double line",
    summary: "Two full lines, one band under the other.",
    glyph: "double",
  },
  {
    id: "full-house",
    name: "Full house",
    summary: "Every square from 000000 to 999999.",
    glyph: "all",
  },
];

export const STAMP_LABEL: Record<CallId, string> = {
  "mini-line": "Mini-line",
  "five-stack": "Five-stack",
  "mini-house": "Mini-house",
  "full-line": "Full line",
  "double-line": "Double line",
  "full-house": "Full house",
};
