import { cn } from "cn";

export function Wordmark({ className, plain = false }: { className?: string; plain?: boolean }) {
  return (
    <span className={cn(!plain && "font-heading", "tracking-tight", className)}>
      2FA <span className="text-[#1f8a4d]">Bingo</span>
    </span>
  );
}
