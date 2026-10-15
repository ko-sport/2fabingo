import { daubStyle } from "@/lib/colors";

const SIZE = 16;

function level(index: number) {
  const row = Math.floor(index / SIZE);
  const col = index % SIZE;
  if (row === 6) return col % 4 === 0 ? 6 : 3;
  if ((row * 5 + col * 3) % 13 === 0) return 5;
  if ((row + col * 2) % 9 === 0) return 2;
  if ((row * 2 + col) % 11 === 0) return 1;
  return 0;
}

export function SampleCard() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] rotate-[-2.5deg]">
      <div className="paper-card rounded-2xl p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-heading text-xl text-[#14211b]">Card 25</p>
          <p className="font-mono text-xs text-[#6b7f72]">row 04</p>
        </div>
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: SIZE * SIZE }, (_, index) => {
            const style = daubStyle(level(index));
            return (
              <span
                key={index}
                className="aspect-square rounded-[2px]"
                style={{ background: style.background }}
              />
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-3 -bottom-4 rotate-[-8deg] rounded-full border-4 border-[#c5341a] px-4 py-2 font-heading text-lg tracking-[0.18em] text-[#c5341a] uppercase">
        Mini-line
      </div>
    </div>
  );
}
