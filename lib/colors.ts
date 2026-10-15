import { CELLS_PER_CARD } from "@/lib/codes";

function mix(
  from: [number, number, number],
  to: [number, number, number],
  t: number,
): string {
  const u = Math.min(1, Math.max(0, t));
  const channels = from.map((value, index) =>
    Math.round(value + (to[index] - value) * u),
  );
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

const LIGHT: [number, number, number] = [198, 232, 208];
const DEEP: [number, number, number] = [5, 36, 20];

export function daubStyle(count: number): { background: string; color: string } {
  if (count <= 0) {
    return { background: "#e7f2ea", color: "#14211b" };
  }
  const t = Math.min(1, (count - 1) / 11);
  const eased = 1 - (1 - t) ** 1.4;
  return {
    background: mix(LIGHT, DEEP, eased),
    color: eased > 0.45 ? "#f4f7f2" : "#14241c",
  };
}

export function cardTabStyle(
  filled: number,
  house: boolean,
): { background: string; color: string } {
  if (house) return { background: "#0c3d28", color: "#f4f7f2" };
  if (filled <= 0) return { background: "#e7f2ea", color: "#4d6156" };
  const t = Math.sqrt(Math.min(1, filled / CELLS_PER_CARD));
  const background = mix([231, 242, 234], [15, 92, 56], t);
  return { background, color: t > 0.62 ? "#f4f7f2" : "#1c1712" };
}
