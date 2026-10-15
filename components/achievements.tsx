"use client";

import { memo } from "react";
import type { Analysis, CallId } from "@/lib/bingo";
import { CALLS } from "@/lib/calls";
import { CELLS_PER_CARD, bandLabel, pad2 } from "@/lib/codes";
import { useAnalysis } from "@/components/card-store";
import { CallGlyph } from "@/components/call-glyph";

function unlocked(id: CallId, analysis: Analysis) {
  switch (id) {
    case "mini-line":
      return analysis.miniLines.length > 0;
    case "five-stack":
      return analysis.fiveStacks.length > 0;
    case "mini-house":
      return analysis.houses.length > 0;
    case "full-line":
      return analysis.fullLines.length > 0;
    case "double-line":
      return analysis.twoFullLines.length > 0;
    case "full-house":
      return analysis.fullHouse;
  }
}

function progress(id: CallId, analysis: Analysis): { value: number; max: number; label: string } {
  switch (id) {
    case "mini-line":
      return {
        value: analysis.closestRow?.filled ?? (analysis.miniLines.length ? 100 : 0),
        max: 100,
        label: analysis.closestRow
          ? `Closest row: card ${pad2(analysis.closestRow.card)}, row ${pad2(analysis.closestRow.row)}`
          : analysis.miniLines.length
            ? `${analysis.miniLines.length.toLocaleString()} complete`
            : "No row started",
      };
    case "five-stack":
      return {
        value: analysis.closestFive?.completeRows ?? (analysis.fiveStacks.length ? 5 : 0),
        max: 5,
        label: analysis.closestFive
          ? `Closest stack: card ${pad2(analysis.closestFive.card)}, rows ${pad2(analysis.closestFive.start)}–${pad2(analysis.closestFive.start + 4)}`
          : analysis.fiveStacks.length
            ? `${analysis.fiveStacks.length.toLocaleString()} stacks`
            : "No stack started",
      };
    case "mini-house":
      return {
        value: analysis.closestHouse?.filled ?? (analysis.houses.length ? CELLS_PER_CARD : 0),
        max: CELLS_PER_CARD,
        label: analysis.closestHouse
          ? `Closest card: ${pad2(analysis.closestHouse.card)}`
          : analysis.houses.length
            ? `${analysis.houses.length} houses`
            : "No card started",
      };
    case "full-line":
      return {
        value: analysis.closestFullLine?.houses ?? (analysis.fullLines.length ? 10 : 0),
        max: 10,
        label: analysis.closestFullLine
          ? `Closest band ${analysis.closestFullLine.metaRow}, ${bandLabel(analysis.closestFullLine.metaRow)}`
          : analysis.fullLines.length
            ? `${analysis.fullLines.length} full lines`
            : "No band started",
      };
    case "double-line":
      return {
        value: analysis.closestDouble?.houses ?? (analysis.twoFullLines.length ? 20 : 0),
        max: 20,
        label: analysis.closestDouble
          ? `Closest pair: bands ${analysis.closestDouble.start}–${analysis.closestDouble.start + 1}`
          : "Two touching bands",
      };
    case "full-house":
      return {
        value: analysis.filled,
        max: 1_000_000,
        label: `${analysis.filled.toLocaleString()} / 1,000,000`,
      };
  }
}

function examples(id: CallId, analysis: Analysis): string[] {
  switch (id) {
    case "mini-line":
      return analysis.miniLines.slice(0, 3).map(
        (line) => `Card ${pad2(line.card)} · row ${pad2(line.row)}`,
      );
    case "five-stack":
      return analysis.fiveStacks
        .filter((run) => run.length < 100)
        .slice(0, 3)
        .map((run) => {
          const end = run.start + run.length - 1;
          return `Card ${pad2(run.card)} · rows ${pad2(run.start)}–${pad2(end)}`;
        });
    case "mini-house":
      return analysis.houses.slice(0, 4).map((card) => `Card ${pad2(card)}`);
    case "full-line":
      return analysis.fullLines.map(
        (band) => `Band ${band} · ${bandLabel(band)}`,
      );
    case "double-line":
      return analysis.twoFullLines.map((run) => {
        const end = run.start + run.length - 1;
        return `Bands ${run.start}–${end}`;
      });
    case "full-house":
      return analysis.fullHouse ? ["The whole million"] : [];
  }
}

export const Achievements = memo(function Achievements() {
  const analysis = useAnalysis();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-xl text-[#14211b]">Calls</h2>
        <p className="text-sm text-muted-foreground">
          Lines run left to right. A square counts once it has been daubed.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {CALLS.map((call) => {
          const called = unlocked(call.id, analysis);
          const meter = progress(call.id, analysis);
          const notes = called ? examples(call.id, analysis) : [];
          const width = Math.max(0, Math.min(100, (meter.value / meter.max) * 100));
          return (
            <li
              key={call.id}
              className="rounded-xl border border-[#c5d6c9] bg-[#f4faf6] p-3"
            >
              <div className="flex gap-3">
                <CallGlyph kind={call.glyph} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-heading text-lg leading-none">{call.name}</h3>
                    <span
                      className={
                        called
                          ? "font-mono text-[11px] tracking-wide text-[#146b43] uppercase"
                          : "font-mono text-[11px] tracking-wide text-[#6b7f72] uppercase"
                      }
                    >
                      {called ? "Called" : "Open"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#4d6156]">{call.summary}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d7e6dc]">
                    <div
                      className="h-full rounded-full bg-[#1b6b45]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#6b7f72]">
                    {meter.label}
                    {meter.max <= 100
                      ? ` · ${Math.min(meter.value, meter.max)}/${meter.max}`
                      : ""}
                  </p>
                  {notes.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-0.5 font-mono text-[11px] text-[#14211b]">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                      {call.id === "mini-line" && analysis.miniLines.length > 3 ? (
                        <li className="text-[#6b7f72]">
                          and {(analysis.miniLines.length - 3).toLocaleString()} more
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
