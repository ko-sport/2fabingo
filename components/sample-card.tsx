import { coverageStyle } from "@/lib/colors";

const SIZE = 10;

function level(index: number) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  if (row === 4) return col < 8 ? 40 + col * 8 : 100;
  if ((row * 3 + col) % 7 === 0) return 18;
  if ((row + col) % 5 === 0) return 6;
  return 0;
}

export function SampleCard() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] rotate-[-2deg]">
      <div className="paper-card rounded-2xl p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="font-heading text-xl text-[#14211b]">The whole set</p>
          <p className="font-mono text-[10px] text-[#6b7f72]">000000–010000</p>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: SIZE * SIZE }, (_, index) => {
            const filled = level(index);
            const style = coverageStyle(filled, 100);
            return (
              <span
                key={index}
                className="aspect-square rounded-[3px]"
                style={{ background: style.background }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
