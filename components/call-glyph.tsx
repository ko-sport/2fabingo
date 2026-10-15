import type { GlyphKind } from "@/lib/calls";
import { cn } from "cn";

export function CallGlyph({
  kind,
  className,
}: {
  kind: GlyphKind;
  className?: string;
}) {
  if (kind === "full" || kind === "double" || kind === "all") {
    return (
      <div
        className={cn("grid w-14 grid-cols-10 gap-px", className)}
        aria-hidden
      >
        {Array.from({ length: 100 }, (_, index) => {
          const row = Math.floor(index / 10);
          const on =
            kind === "all" ||
            (kind === "full" && row === 4) ||
            (kind === "double" && (row === 4 || row === 5));
          return (
            <span
              key={index}
              className={cn(
                "aspect-square rounded-[1px]",
                on ? "bg-[#1b6b45]" : "bg-[#d7e6dc]",
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("grid w-14 grid-cols-8 gap-px", className)} aria-hidden>
      {Array.from({ length: 64 }, (_, index) => {
        const row = Math.floor(index / 8);
        const on =
          kind === "house" ||
          (kind === "line" && row === 3) ||
          (kind === "five" && row >= 2 && row <= 6);
        return (
          <span
            key={index}
            className={cn(
              "aspect-square rounded-[1px]",
              on ? "bg-[#1b6b45]" : "bg-[#d7e6dc]",
            )}
          />
        );
      })}
    </div>
  );
}
