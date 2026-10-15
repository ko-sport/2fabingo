import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

const GREY = ["#d4dad6", "#c5ccc8", "#b7c0bb"];
const GREEN = ["#cfe8d8", "#7dbe96", "#3c9a64", "#1b6b45", "#0d4428"];

/** A still of a card already underway. Digits are depth, not labels. */
const PATTERN = [
  "0010201000",
  "0003410000",
  "1124521000",
  "0023510001",
  "0001200100",
  "0100002000",
  "0000100000",
  "2000001000",
  "0000000100",
  "0100000002",
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <h1 className="text-5xl text-[#14211b] sm:text-6xl">
        <Wordmark />
      </h1>
      <Link
        href="/board"
        aria-label="Open the card"
        className="mt-10 w-full max-w-[min(100%,440px)]"
      >
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {PATTERN.join("").split("").map((digit, index) => {
            const depth = Number(digit);
            const background =
              depth === 0 ? GREY[index % GREY.length] : GREEN[depth - 1];
            return (
              <span
                key={index}
                className="aspect-square rounded-[4px]"
                style={{ background }}
              />
            );
          })}
        </div>
      </Link>
    </div>
  );
}
