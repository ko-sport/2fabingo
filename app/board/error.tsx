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
      <h1 className="font-heading text-4xl text-[#10241c]">The card didn’t open</h1>
      <p className="max-w-sm text-sm text-[#4d6156]">
        Something went wrong loading your squares. Try again in a moment.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
