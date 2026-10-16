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

export type CardTone = "green" | "blue";

const PALETTE: Record<
  CardTone,
  {
    empty: string;
    emptyInk: string;
    light: [number, number, number];
    deep: [number, number, number];
    paper: [number, number, number];
    full: [number, number, number];
    quiet: string;
  }
> = {
  green: {
    empty: "#e7f2ea",
    emptyInk: "#14211b",
    light: [198, 232, 208],
    deep: [5, 36, 20],
    paper: [231, 242, 234],
    full: [12, 61, 40],
    quiet: "#3d5246",
  },
  blue: {
    empty: "#e7f1fa",
    emptyInk: "#142033",
    light: [186, 214, 242],
    deep: [7, 24, 48],
    paper: [231, 241, 250],
    full: [12, 48, 92],
    quiet: "#3d4e62",
  },
};

export function daubStyle(
  count: number,
  tone: CardTone = "green",
): { background: string; color: string } {
  const palette = PALETTE[tone];
  if (count <= 0) {
    return { background: palette.empty, color: palette.emptyInk };
  }
  const t = Math.min(1, (count - 1) / 11);
  const eased = 1 - (1 - t) ** 1.4;
  return {
    background: mix(palette.light, palette.deep, eased),
    color: eased > 0.45 ? "#f4f7f2" : palette.emptyInk,
  };
}

/** Shade a block or a hundred by how much of it is registered. Any progress is visibly green. */
export function coverageStyle(
  filled: number,
  total: number,
  tone: CardTone = "green",
): { background: string; color: string } {
  const palette = PALETTE[tone];
  if (filled <= 0 || total <= 0) {
    return { background: palette.empty, color: palette.quiet };
  }
  if (filled >= total) {
    return {
      background: `rgb(${palette.full[0]} ${palette.full[1]} ${palette.full[2]})`,
      color: "#f4f7f2",
    };
  }
  const t = Math.min(1, 0.22 + 0.78 * Math.sqrt(filled / total));
  const background = mix(palette.paper, palette.full, t);
  return { background, color: t > 0.62 ? "#f4f7f2" : palette.emptyInk };
}
