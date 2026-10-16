"use client";

import { memo, useSyncExternalStore } from "react";
import { formatCode } from "@/lib/codes";
import { coverageStyle, daubStyle } from "@/lib/colors";
import {
  blockStart,
  cellCode,
  pageStart,
  spanEnd,
  spanLabel,
} from "@/lib/zoom";
import { useAnalysis, useCardStore } from "@/components/card-store";
import { cn } from "cn";

export type Zoom =
  | { level: 0 }
  | { level: 1; block: number }
  | { level: 2; block: number; page: number; focus: number | null };

function useVersion() {
  const store = useCardStore();
  return useSyncExternalStore(
    store.subscribe,
    () => store.version,
    () => store.version,
  );
}

export const LocatorGrid = memo(function LocatorGrid({
  zoom,
  onOpen,
  onSelect,
  onRemove,
}: {
  zoom: Zoom;
  onOpen: (index: number) => void;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const analysis = useAnalysis();
  const store = useCardStore();
  useVersion();

  return (
    <div
      className="grid grid-cols-10 gap-1 sm:gap-1.5"
      data-testid="locator-grid"
      data-level={zoom.level}
    >
      {Array.from({ length: 100 }, (_, index) => {
        if (zoom.level === 0) {
          const filled = analysis.cards[index]?.filled ?? 0;
          const style = coverageStyle(filled, 10_000);
          const start = blockStart(index);
          return (
            <Cell
              key={index}
              style={style}
              label={spanLabel(start, start + 10_000)}
              ariaLabel={`${spanLabel(start, start + 10_000)}, ${filled.toLocaleString()} of 10,000`}
              onClick={() => onOpen(index)}
              lines={[formatCode(start), "to", spanEnd(start + 10_000)]}
            />
          );
        }

        if (zoom.level === 1) {
          const filled = analysis.pageFill[zoom.block * 100 + index] ?? 0;
          const style = coverageStyle(filled, 100);
          const start = pageStart(zoom.block, index);
          return (
            <Cell
              key={index}
              style={style}
              label={spanLabel(start, start + 100)}
              ariaLabel={`${spanLabel(start, start + 100)}, ${filled} of 100`}
              onClick={() => onOpen(index)}
              lines={[formatCode(start), "to", spanEnd(start + 100)]}
            />
          );
        }

        const code = cellCode(zoom.block, zoom.page, index);
        const count = store.get(code);
        const style = daubStyle(count);
        const focused = zoom.focus === code;
        return (
          <Cell
            key={index}
            style={style}
            label={formatCode(code)}
            ariaLabel={
              focused
                ? count === 0
                  ? `${formatCode(code)}, selected`
                  : `${formatCode(code)}, selected, registered ${count} ${count === 1 ? "time" : "times"}`
                : count === 0
                  ? `${formatCode(code)}, not registered`
                  : `${formatCode(code)}, registered ${count} ${count === 1 ? "time" : "times"}`
            }
            focused={focused}
            onClick={() => onSelect(index)}
            onContextMenu={() => onRemove(index)}
            lines={[formatCode(code)]}
            badge={count > 1 ? (count > 99 ? "99+" : `${count}×`) : null}
            testId={focused ? "focus-cell" : undefined}
          />
        );
      })}
    </div>
  );
});

function Cell({
  style,
  label,
  ariaLabel,
  onClick,
  onContextMenu,
  lines,
  badge,
  focused,
  testId,
}: {
  style: { background: string; color: string };
  label: string;
  ariaLabel: string;
  onClick: () => void;
  onContextMenu?: () => void;
  lines: string[];
  badge?: string | null;
  focused?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={label}
      data-testid={testId}
      onClick={onClick}
      onContextMenu={
        onContextMenu
          ? (event) => {
              event.preventDefault();
              onContextMenu();
            }
          : undefined
      }
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-[4px] px-px text-center font-mono leading-none",
        focused && "z-10 ring-2 ring-[#c5341a] ring-offset-2 ring-offset-[#f7fbf8]",
      )}
      style={{ background: style.background, color: style.color }}
    >
      {lines.map((line) => (
        <span
          key={line}
          className="block text-[6px] leading-tight tracking-tighter whitespace-nowrap sm:text-[10px] sm:tracking-tight md:text-[11px]"
        >
          {line}
        </span>
      ))}
      {badge ? (
        <span className="mt-0.5 text-[8px] font-semibold sm:text-[10px]">{badge}</span>
      ) : null}
    </button>
  );
}
