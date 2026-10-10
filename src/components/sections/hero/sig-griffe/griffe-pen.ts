import { type SignatureStroke } from "./griffe-geometry";

/*
  Pen timing and drawing for the griffe autograph.

  Time is measured in "pen units": one unit is one design px of ink at cruising speed. The pen
  accelerates out of each pen-down and brakes into each pen-up (RAMP), slows a touch in tight turns
  (TURN_SLOWDOWN), and travels faster in the air between strokes (LIFT_*). The scroll then maps to
  pen time linearly, which gives an even writing speed per unit of scroll.
*/
const RAMP = 30;
const MIN_SPEED = 0.35;
const TURN_SLOWDOWN = 0.9;
const TURN_SPAN = 2;
const LIFT_BASE = 6;
const LIFT_SPEED = 3;
/** Widths are batched in steps of 1/8 px so the stroke is drawn in few calls. */
const WIDTH_STEP = 8;

type PenStroke = {
  readonly points: readonly number[];
  readonly times: Float64Array;
};

export type Pen = {
  readonly strokes: readonly PenStroke[];
  /** Pen time at the end of the paraphe. */
  readonly total: number;
  /** Pen time where the load-time stroke rests (the foot of the peak A). */
  readonly rest: number;
};

const v = (a: readonly number[], i: number) => a[i] ?? 0;

export function buildPen(source: readonly SignatureStroke[]): Pen {
  const strokes: PenStroke[] = [];
  let t = 0;
  let rest = 0;
  let last: [number, number] | null = null;

  for (const { points: p, rest: restIndex } of source) {
    const n = p.length / 3;
    if (last) t += LIFT_BASE + Math.hypot(v(p, 0) - last[0], v(p, 1) - last[1]) / LIFT_SPEED;

    let length = 0;
    for (let i = 1; i < n; i++) {
      length += Math.hypot(v(p, i * 3) - v(p, i * 3 - 3), v(p, i * 3 + 1) - v(p, i * 3 - 2));
    }

    const times = new Float64Array(n);
    times[0] = t;
    let s = 0;
    for (let i = 1; i < n; i++) {
      const ds = Math.hypot(v(p, i * 3) - v(p, i * 3 - 3), v(p, i * 3 + 1) - v(p, i * 3 - 2));
      s += ds;
      const a = Math.max(0, i - TURN_SPAN) * 3;
      const c = Math.min(n - 1, i + TURN_SPAN) * 3;
      const ax = v(p, i * 3) - v(p, a);
      const ay = v(p, i * 3 + 1) - v(p, a + 1);
      const cx = v(p, c) - v(p, i * 3);
      const cy = v(p, c + 1) - v(p, i * 3 + 1);
      const cos = (ax * cx + ay * cy) / (Math.hypot(ax, ay) * Math.hypot(cx, cy) || 1);
      const turn = Math.acos(Math.min(1, Math.max(-1, cos)));
      const ramp = Math.min(1, MIN_SPEED + ((1 - MIN_SPEED) * Math.min(s, length - s)) / RAMP);
      t += (ds * (1 + TURN_SLOWDOWN * Math.min(1, turn / 1.2))) / Math.max(MIN_SPEED, ramp);
      times[i] = t;
    }
    if (restIndex >= 0) rest = times[restIndex] ?? 0;

    strokes.push({ points: p, times });
    last = [v(p, (n - 1) * 3), v(p, (n - 1) * 3 + 1)];
  }

  return { strokes, total: t, rest };
}

/** Draws every stroke up to pen time `t`, the last one cut where the pen is. */
export function drawPen(ctx: CanvasRenderingContext2D, pen: Pen, t: number) {
  for (const { points: p, times } of pen.strokes) {
    if ((times[0] ?? 0) > t) break;
    let width = -1;
    ctx.beginPath();
    for (let i = 1; i < times.length; i++) {
      const t0 = times[i - 1] ?? 0;
      const t1 = times[i] ?? 0;
      if (t0 >= t) break;
      const x0 = v(p, i * 3 - 3);
      const y0 = v(p, i * 3 - 2);
      let x = v(p, i * 3);
      let y = v(p, i * 3 + 1);
      if (t1 > t) {
        const f = (t - t0) / (t1 - t0);
        x = x0 + (x - x0) * f;
        y = y0 + (y - y0) * f;
      }
      const w = Math.round(((v(p, i * 3 - 1) + v(p, i * 3 + 2)) / 2) * WIDTH_STEP) / WIDTH_STEP;
      if (w !== width) {
        if (width > 0) ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = w;
        width = w;
        ctx.moveTo(x0, y0);
      }
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
