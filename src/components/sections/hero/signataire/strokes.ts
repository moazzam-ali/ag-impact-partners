/*
  The pen's strokes for one page, in page pixels (y down): a strike through a phrase, the initials
  in the margin beside it, the signature and its underline. The signature is drawn, not lettered: a
  run of slanted loops of irregular size (a prolate cycloid, loops at the top), the way a practised
  signature reads from a distance. Seeded, so it is the same hand on every page.
*/
type Point = [number, number];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Loops along a baseline: widths and heights per loop, a slant, a gentle drift. */
function loops(x0: number, baseline: number, widths: number[], heights: number[], slant: number) {
  const out: Point[] = [];
  let x = x0;
  widths.forEach((w, i) => {
    const h = heights[i] ?? 30;
    const r = w / (Math.PI * 2);
    const k = 1.75;
    for (let s = 0; s <= 48; s++) {
      if (i > 0 && s === 0) continue;
      const t = (s / 48) * Math.PI * 2;
      const px = x + r * (t - k * Math.sin(t)) + r * k * 0;
      const py = baseline - h * (1 + Math.cos(t)) * 0.5 + h * 0.08;
      out.push([px + (baseline - py) * slant, py]);
    }
    x += w;
  });
  return out;
}

function line(x1: number, y1: number, x2: number, y2: number, bow: number, steps = 40): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * bow]);
  }
  return out;
}

export function strikeStroke(x1: number, x2: number, y: number): Point[] {
  return line(x1 - 6, y + 2, x2 + 8, y - 3, -2, 30);
}

/** Initials in the margin: two quick loops and a flick. */
export function paraphe(x: number, y: number): Point[] {
  return [
    ...loops(x - 30, y + 14, [26, 20, 16], [46, 26, 20], 0.3),
    ...line(x + 34, y + 12, x + 52, y - 10, 2, 8).slice(1),
  ];
}

/** One letter-like movement of the signature, starting and ending on the baseline. */
export type Move = { kind: "loop" | "arch"; w: number; h: number };

/*
  A practised signature, read from a distance: a tall opening loop, low arches, a second ascender,
  a few more arches, then a tail that drops below and sweeps back under the name. Loops are
  prolate cycloids (they cross themselves at the top), arches curtate ones (they don't).
*/
const MOVES: Move[] = [
  { kind: "loop", w: 50, h: 150 },
  { kind: "arch", w: 26, h: 40 },
  { kind: "arch", w: 24, h: 34 },
  { kind: "loop", w: 34, h: 104 },
  { kind: "arch", w: 22, h: 30 },
  { kind: "arch", w: 22, h: 26 },
  { kind: "arch", w: 20, h: 24 },
  { kind: "loop", w: 30, h: 78 },
  { kind: "arch", w: 20, h: 20 },
];

/** A second hand, for the other party: arches first, one tall loop, a shorter run. */
export const OTHER_HAND: Move[] = [
  { kind: "arch", w: 30, h: 46 },
  { kind: "loop", w: 44, h: 138 },
  { kind: "arch", w: 22, h: 28 },
  { kind: "arch", w: 24, h: 34 },
  { kind: "loop", w: 26, h: 64 },
  { kind: "arch", w: 18, h: 22 },
  { kind: "arch", w: 16, h: 18 },
];

/** The signature (body with its sweeping tail) and the quick flick over it, sized to the line. */
export function signature(
  x1: number,
  x2: number,
  baseline: number,
  seed = 7,
  moves: Move[] = MOVES,
): Point[][] {
  const MOVES = moves;
  const r = rng(seed);
  const total = MOVES.reduce((a, m) => a + m.w, 0);
  const scale = (x2 - x1 - 60) / total;
  const slant = 0.34;
  const body: Point[] = [];
  let x = x1;
  MOVES.forEach((move, i) => {
    const w = move.w * scale * (0.92 + r() * 0.16);
    const h = move.h * (0.9 + r() * 0.2);
    const base = baseline - i * 2.5;
    const rad = w / (Math.PI * 2);
    const k = move.kind === "loop" ? 1.9 : 0.45;
    const steps = move.kind === "loop" ? 56 : 32;
    for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
      const u = s / steps;
      const t = move.kind === "loop" ? Math.PI + u * Math.PI * 2 : u * Math.PI * 2;
      const px = x + rad * (u * Math.PI * 2 - k * Math.sin(t));
      const py =
        move.kind === "loop"
          ? base - (h * (1 + Math.cos(t))) / 2
          : base - (h * (1 - Math.cos(t))) / 2;
      body.push([px + (base - py) * slant, py]);
    }
    x += w;
  });

  // The tail: down and right off the last arch, then back under the whole name, ending in a hook.
  const end = body.at(-1) ?? [x2, baseline];
  const p0 = end;
  const p1: Point = [end[0] + 70, end[1] + 70];
  const p2: Point = [x1 + 40, baseline + 86];
  const p3: Point = [x1 - 24, baseline + 30];
  for (let s = 1; s <= 60; s++) {
    const t = s / 60;
    const a = (1 - t) ** 3;
    const b = 3 * (1 - t) ** 2 * t;
    const c = 3 * (1 - t) * t * t;
    const d = t ** 3;
    body.push([
      a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
      a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
    ]);
  }

  // A quick flick over the second ascender, like a dot.
  const fx = x1 + (MOVES[0]!.w + MOVES[1]!.w + MOVES[2]!.w + MOVES[3]!.w * 0.5) * scale + 50;
  const flick = line(fx, baseline - 132, fx + 22, baseline - 140, -2, 10);
  return [body, flick];
}
