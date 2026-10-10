import { type FigmaLine } from "./figma-geometry";

/*
  The two peach lines at runtime. Their Bézier chains are fitted offline in the Figma frame space;
  here they are bent to the measured headline (bendLine) and given the script's nib: a filled outline
  whose width follows the stroke's direction like the font's (thin going up or sideways, swelling on
  the slanted downstrokes), tapered where the pen touches down and lifts off (ribbon).
*/

export type Point = { x: number; y: number };
export type Sample = { x: number; y: number; s: number };

const STEP = 2;

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** Points along a cubic chain [x0, y0, x1, y1, x2, y2, x3, y3, …], about `step` apart. */
function sampleChain(p: readonly number[], step: number): Point[] {
  const out: Point[] = [{ x: p[0] ?? 0, y: p[1] ?? 0 }];
  let travelled = 0;
  for (let i = 2; i + 5 < p.length; i += 6) {
    const x0 = p[i - 2] ?? 0;
    const y0 = p[i - 1] ?? 0;
    const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0] = p.slice(i, i + 6);
    const hull =
      Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
    const n = Math.max(8, Math.ceil(hull / (step * 0.25)));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      const prev = out[out.length - 1] ?? { x, y };
      travelled += Math.hypot(x - prev.x, y - prev.y);
      const end = i + 6 >= p.length && k === n;
      if (travelled >= step || end) {
        out.push({ x, y });
        travelled = 0;
      }
    }
  }
  return out;
}

/**
 * The line bent to the measured layout: near its headline end it moves with the anchor, near the
 * script with the script, and the pull eases from one to the other over `line.blend` (a smooth
 * displacement along the length, so the curve keeps its flow).
 */
export function bendLine(line: FigmaLine, toAnchor: Point, toScript: Point): Sample[] {
  const pts = sampleChain(line.points, STEP);
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    lengths.push((lengths[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
  }
  const total = lengths[lengths.length - 1] || 1;
  const [from, to] = line.blend;
  const bent = pts.map((pt, i) => {
    const f = (lengths[i] ?? 0) / total;
    const fade = smoothstep((f - from) / (to - from));
    const w = line.anchor === "start" ? 1 - fade : fade;
    return {
      x: pt.x + w * toAnchor.x + (1 - w) * toScript.x,
      y: pt.y + w * toAnchor.y + (1 - w) * toScript.y,
      s: 0,
    };
  });
  for (let i = 1; i < bent.length; i++) {
    const a = bent[i - 1];
    const b = bent[i];
    if (a && b) b.s = a.s + Math.hypot(b.x - a.x, b.y - a.y);
  }
  return bent;
}

const n1 = (v: number) => Math.round(v * 10) / 10;

/** The centreline as path data: what the reveal mask draws along. */
export function routePath(samples: readonly Sample[]): string {
  return `M${samples.map((p) => `${n1(p.x)} ${n1(p.y)}`).join("L")}`;
}

export type RibbonNib = {
  /** Width of an upstroke or a sideways stroke (design px). */
  hair: number;
  /** Width of a full downstroke along the script's slant. */
  swell: number;
  /** Width where the line starts, and over how many px it grows to its natural width. */
  startWidth: number;
  startTaper: number;
  /** Width where the line ends, and over how many px it shrinks to it. */
  endWidth: number;
  endTaper: number;
};

// The script's downstroke direction (its slant), in screen axes: down and a little to the left.
const AXIS = { x: -0.42, y: 0.91 };
const AXIS_LENGTH = Math.hypot(AXIS.x, AXIS.y);
/** Width smoothing, in samples either side (about 20 px). */
const SMOOTH = 10;

/** The line as a filled outline with a pen-pressure width. */
export function ribbon(samples: readonly Sample[], nib: RibbonNib): string {
  const last = samples.length - 1;
  const length = samples[last]?.s ?? 0;
  const tangents = samples.map((_, i) => {
    const a = samples[Math.max(0, i - 1)];
    const b = samples[Math.min(last, i + 1)];
    const dx = (b?.x ?? 0) - (a?.x ?? 0);
    const dy = (b?.y ?? 0) - (a?.y ?? 0);
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  });
  const pressure = tangents.map((t) => {
    const press = Math.max(0, (t.x * AXIS.x + t.y * AXIS.y) / AXIS_LENGTH);
    return nib.hair + (nib.swell - nib.hair) * press * press;
  });
  const left: string[] = [];
  const right: string[] = [];
  samples.forEach((pt, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - SMOOTH); j <= Math.min(last, i + SMOOTH); j++) {
      sum += pressure[j] ?? 0;
      count++;
    }
    const natural = sum / count;
    const grown = nib.startWidth + (natural - nib.startWidth) * smoothstep(pt.s / nib.startTaper);
    const w = nib.endWidth + (grown - nib.endWidth) * smoothstep((length - pt.s) / nib.endTaper);
    const t = tangents[i] ?? { x: 1, y: 0 };
    const h = w / 2;
    left.push(`${n1(pt.x - t.y * h)} ${n1(pt.y + t.x * h)}`);
    right.push(`${n1(pt.x + t.y * h)} ${n1(pt.y - t.x * h)}`);
  });
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}
