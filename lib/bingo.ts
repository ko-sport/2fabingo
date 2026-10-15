import {
  CARD_COUNT,
  CODE_COUNT,
  GRID_SIZE,
  bandLabel,
  metaRowOf,
  pad2,
  splitCode,
} from "./codes";

export type LineRun = { card: number; start: number; length: number };
export type MetaRun = { start: number; length: number };

export type CardSummary = {
  filled: number;
  completeRows: number;
  house: boolean;
};

export type ClosestRow = { card: number; row: number; filled: number };
export type ClosestFive = {
  card: number;
  start: number;
  completeRows: number;
  filled: number;
};
export type ClosestHouse = { card: number; filled: number };
export type ClosestFullLine = { metaRow: number; houses: number };
export type ClosestDouble = { start: number; houses: number };

export type Analysis = {
  filled: number;
  totalDaubs: number;
  cards: CardSummary[];
  miniLines: { card: number; row: number }[];
  fiveStacks: LineRun[];
  houses: number[];
  fullLines: number[];
  twoFullLines: MetaRun[];
  fullHouse: boolean;
  closestRow: ClosestRow | null;
  closestFive: ClosestFive | null;
  closestHouse: ClosestHouse | null;
  closestFullLine: ClosestFullLine | null;
  closestDouble: ClosestDouble | null;
  /** How many of the 100 codes in each hundred are registered. Index is block * 100 + page. */
  pageFill: Uint16Array;
};

export type CallId =
  | "mini-line"
  | "five-stack"
  | "mini-house"
  | "full-line"
  | "double-line"
  | "full-house";

export type CallEvent = {
  id: CallId;
  first: boolean;
  detail: string;
};

const CALL_RANK: CallId[] = [
  "full-house",
  "double-line",
  "full-line",
  "mini-house",
  "five-stack",
  "mini-line",
];

export function analyze(marks: Iterable<[number, number]>): Analysis {
  const rowFill = new Uint16Array(CARD_COUNT * GRID_SIZE);
  const cardFill = new Uint32Array(CARD_COUNT);
  let filled = 0;
  let totalDaubs = 0;

  for (const [code, count] of marks) {
    if (!Number.isFinite(count) || count <= 0) continue;
    if (!Number.isInteger(code) || code < 0 || code >= CODE_COUNT) continue;
    const { card, row } = splitCode(code);
    const index = card * GRID_SIZE + row;
    if (rowFill[index] < GRID_SIZE) rowFill[index] += 1;
    cardFill[card] += 1;
    filled += 1;
    totalDaubs += count;
  }

  const miniLines: { card: number; row: number }[] = [];
  const fiveStacks: LineRun[] = [];
  const houses: number[] = [];
  const cards: CardSummary[] = [];
  let closestRow: ClosestRow | null = null;
  let closestFive: ClosestFive | null = null;
  let closestHouse: ClosestHouse | null = null;

  for (let card = 0; card < CARD_COUNT; card++) {
    let completeRows = 0;
    let runStart = 0;
    let runLength = 0;

    const closeRun = () => {
      if (runLength >= 5) {
        fiveStacks.push({ card, start: runStart, length: runLength });
      }
      runLength = 0;
    };

    for (let row = 0; row < GRID_SIZE; row++) {
      const n = rowFill[card * GRID_SIZE + row];
      if (n === GRID_SIZE) {
        completeRows += 1;
        miniLines.push({ card, row });
        if (runLength === 0) runStart = row;
        runLength += 1;
      } else {
        if (runLength > 0) closeRun();
        if (n > (closestRow?.filled ?? 0)) {
          closestRow = { card, row, filled: n };
        }
      }
    }
    if (runLength > 0) closeRun();

    const house = completeRows === GRID_SIZE;
    if (house) houses.push(card);
    cards.push({
      filled: cardFill[card],
      completeRows,
      house,
    });

    if (!house && cardFill[card] > (closestHouse?.filled ?? 0)) {
      closestHouse = { card, filled: cardFill[card] };
    }

    for (let start = 0; start <= GRID_SIZE - 5; start++) {
      let complete = 0;
      let cells = 0;
      for (let offset = 0; offset < 5; offset++) {
        const n = rowFill[card * GRID_SIZE + start + offset];
        cells += n;
        if (n === GRID_SIZE) complete += 1;
      }
      if (complete === 5 || (complete === 0 && cells === 0)) continue;
      if (
        closestFive === null ||
        complete > closestFive.completeRows ||
        (complete === closestFive.completeRows && cells > closestFive.filled)
      ) {
        closestFive = { card, start, completeRows: complete, filled: cells };
      }
    }
  }

  const housesPerBand = new Array<number>(10).fill(0);
  for (const card of houses) housesPerBand[metaRowOf(card)] += 1;

  const fullLines: number[] = [];
  const twoFullLines: MetaRun[] = [];
  let bandStart = 0;
  let bandLength = 0;
  const closeBands = () => {
    if (bandLength >= 2) {
      twoFullLines.push({ start: bandStart, length: bandLength });
    }
    bandLength = 0;
  };

  for (let band = 0; band < 10; band++) {
    if (housesPerBand[band] === 10) {
      fullLines.push(band);
      if (bandLength === 0) bandStart = band;
      bandLength += 1;
    } else if (bandLength > 0) {
      closeBands();
    }
  }
  if (bandLength > 0) closeBands();

  let closestFullLine: ClosestFullLine | null = null;
  for (let band = 0; band < 10; band++) {
    if (housesPerBand[band] === 10) continue;
    if (
      closestFullLine === null ||
      housesPerBand[band] > closestFullLine.houses
    ) {
      closestFullLine = { metaRow: band, houses: housesPerBand[band] };
    }
  }

  let closestDouble: ClosestDouble | null = null;
  for (let band = 0; band < 9; band++) {
    const housesInPair = housesPerBand[band] + housesPerBand[band + 1];
    const complete = housesPerBand[band] === 10 && housesPerBand[band + 1] === 10;
    if (complete) continue;
    if (closestDouble === null || housesInPair > closestDouble.houses) {
      closestDouble = { start: band, houses: housesInPair };
    }
  }

  return {
    filled,
    totalDaubs,
    cards,
    miniLines,
    fiveStacks,
    houses,
    fullLines,
    twoFullLines,
    fullHouse: filled === CODE_COUNT,
    closestRow,
    closestFive,
    closestHouse,
    closestFullLine,
    closestDouble,
    pageFill: rowFill,
  };
}

function miniDetail(prev: Analysis, next: Analysis): string {
  const seen = new Set(prev.miniLines.map((line) => line.card * 100 + line.row));
  const added = next.miniLines.find(
    (line) => !seen.has(line.card * 100 + line.row),
  );
  if (!added) return "A row of 100 is complete.";
  return `Card ${pad2(added.card)}, row ${pad2(added.row)}.`;
}

function fiveDetail(prev: Analysis, next: Analysis): string {
  const seen = new Set(
    prev.fiveStacks.map((run) => `${run.card}:${run.start}:${run.length}`),
  );
  const added = next.fiveStacks.find(
    (run) => !seen.has(`${run.card}:${run.start}:${run.length}`),
  );
  if (!added) return "Five consecutive rows are complete.";
  const end = added.start + added.length - 1;
  return `Card ${pad2(added.card)}, rows ${pad2(added.start)}–${pad2(end)}.`;
}

export function detectNewCall(prev: Analysis, next: Analysis): CallEvent | null {
  const events: CallEvent[] = [];

  if (!prev.fullHouse && next.fullHouse) {
    events.push({
      id: "full-house",
      first: true,
      detail: "Every square from 000000 to 999999 is green.",
    });
  }

  const prevBands = prev.twoFullLines.reduce((sum, run) => sum + run.length, 0);
  const nextBands = next.twoFullLines.reduce((sum, run) => sum + run.length, 0);
  if (nextBands > prevBands) {
    const run = [...next.twoFullLines].sort((a, b) => b.length - a.length)[0];
    const end = run.start + run.length - 1;
    events.push({
      id: "double-line",
      first: prev.twoFullLines.length === 0,
      detail: `Bands ${run.start}–${end} (${bandLabel(run.start)} through ${bandLabel(end)}).`,
    });
  }

  if (next.fullLines.length > prev.fullLines.length) {
    const previous = new Set(prev.fullLines);
    const added = next.fullLines.find((band) => !previous.has(band)) ?? next.fullLines[0];
    events.push({
      id: "full-line",
      first: prev.fullLines.length === 0,
      detail: `Band ${added}, ${bandLabel(added)}.`,
    });
  }

  if (next.houses.length > prev.houses.length) {
    const previous = new Set(prev.houses);
    const added = next.houses.filter((card) => !previous.has(card));
    events.push({
      id: "mini-house",
      first: prev.houses.length === 0,
      detail:
        added.length === 1
          ? `Card ${pad2(added[0])} is complete.`
          : `${added.length} cards are complete.`,
    });
  }

  if (next.fiveStacks.length > prev.fiveStacks.length) {
    events.push({
      id: "five-stack",
      first: prev.fiveStacks.length === 0,
      detail: fiveDetail(prev, next),
    });
  }

  if (next.miniLines.length > prev.miniLines.length) {
    const added = next.miniLines.length - prev.miniLines.length;
    events.push({
      id: "mini-line",
      first: prev.miniLines.length === 0,
      detail: added === 1 ? miniDetail(prev, next) : `${added} new mini-lines.`,
    });
  }

  for (const id of CALL_RANK) {
    const event = events.find((item) => item.id === id);
    if (event) return event;
  }
  return null;
}
