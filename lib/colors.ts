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

/** Shade a block or a hundred by how much of it is registered. Any progress is visibly green. */
export function coverageStyle(
  filled: number,
  total: number,
): { background: string; color: string } {
  if (filled <= 0 || total <= 0) {
    return { background: "#e7f2ea", color: "#3d5246" };
  }
  if (filled >= total) return { background: "#0c3d28", color: "#f4f7f2" };
  const t = Math.min(1, 0.22 + 0.78 * Math.sqrt(filled / total));
  const background = mix([231, 242, 234], [12, 61, 40], t);
  return { background, color: t > 0.62 ? "#f4f7f2" : "#14211b" };
}
