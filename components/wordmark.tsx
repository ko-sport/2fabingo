import { cn } from "cn";

export function Wordmark({
  className,
  plain = false,
  tone = "green",
}: {
  className?: string;
  plain?: boolean;
  tone?: "green" | "blue";
}) {
  return (
    <span className={cn(!plain && "font-heading", "tracking-tight", className)}>
      2FA <span className={tone === "blue" ? "text-[#8eb7ef]" : "text-[#1f8a4d]"}>Bingo</span>
    </span>
  );
}
