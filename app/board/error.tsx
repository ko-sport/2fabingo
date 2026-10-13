"use client";

import { Button } from "@/components/ui/button";

export default function BoardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-4xl text-[#f4efe4]">The card didn’t open</h1>
      <p className="max-w-sm text-sm text-[#b7ad9e]">
        Something went wrong loading your squares. Try again in a moment.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
