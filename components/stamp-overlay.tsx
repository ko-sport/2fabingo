"use client";

import { useEffect } from "react";
import type { CallEvent } from "@/lib/bingo";
import { STAMP_LABEL } from "@/lib/calls";

export function StampOverlay({
  event,
  onDone,
}: {
  event: CallEvent | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!event) return;
    const timer = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(timer);
  }, [event, onDone]);

  if (!event) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="stamp-pop max-w-md rounded-full border-[6px] border-[#c5341a] bg-[#f7fbf8]/95 px-8 py-5 text-center text-[#c5341a] shadow-2xl">
        <p className="font-heading text-4xl tracking-[0.16em] uppercase sm:text-5xl">
          {STAMP_LABEL[event.id]}
        </p>
        <p className="mt-2 font-sans text-sm tracking-normal text-[#8d2b1c] normal-case">
          {event.detail}
        </p>
      </div>
    </div>
  );
}
