"use client";

import { memo } from "react";
import { pad2 } from "@/lib/codes";
import { cardTabStyle } from "@/lib/colors";
import { useAnalysis } from "@/components/card-store";
import { cn } from "cn";

export const CardWall = memo(function CardWall({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (card: number) => void;
}) {
  const analysis = useAnalysis();

  return (
    <div className="grid grid-cols-10 gap-1">
      {analysis.cards.map((summary, card) => {
        const style = cardTabStyle(summary.filled, summary.house);
        const active = card === selected;
        return (
          <button
            key={card}
            type="button"
            aria-pressed={active}
            aria-label={`Card ${pad2(card)}, ${summary.filled.toLocaleString()} of 10,000 squares${summary.house ? ", mini-house" : ""}`}
            onClick={() => onSelect(card)}
            className={cn(
              "relative aspect-square rounded-[4px] font-mono text-[10px] leading-none font-medium tabular-nums sm:text-[11px]",
              active && "z-10 ring-2 ring-[#10241c] ring-offset-2 ring-offset-[#f7fbf8]",
            )}
            style={{ background: style.background, color: style.color }}
          >
            {pad2(card)}
            {summary.completeRows > 0 && !summary.house ? (
              <span className="absolute inset-x-1 bottom-0.5 h-1 rounded-full bg-[#e39b2b]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
});
