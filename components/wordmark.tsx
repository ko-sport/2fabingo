import { cn } from "cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading tracking-tight", className)}>
      2FA <span className="text-[#1f8a4d]">Bingo</span>
    </span>
  );
}
