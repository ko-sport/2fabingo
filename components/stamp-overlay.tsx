"use client";

import { useEffect } from "react";

export function StampOverlay({
  title,
  detail,
  onDone,
}: {
  title: string | null;
  detail: string | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!title) return;
    const timer = window.setTimeout(onDone, 2400);
    return () => window.clearTimeout(timer);
  }, [title, detail, onDone]);

  if (!title) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="stamp-pop max-w-md rounded-full border-[6px] border-[#c5341a] bg-[#f7fbf8]/95 px-8 py-5 text-center text-[#c5341a] shadow-2xl">
        <p className="font-heading text-4xl tracking-[0.16em] uppercase sm:text-5xl">
          {title}
        </p>
        {detail ? (
          <p className="mt-2 font-sans text-sm tracking-normal text-[#8d2b1c] normal-case">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
