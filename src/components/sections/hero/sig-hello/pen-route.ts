import { type PenSignature } from "./hello-geometry";

/*
  Turns the signature's pen strokes into what the canvas needs: rest positions, unit normals (the
  direction a plucked point moves) and, for every point, the moment the pen reaches it.

  Timing follows a hand, not an ease: constant speed along the arc length, a little slower in tight
  turns, a short stop where the pen reverses, a soft start and finish on every stroke, and a pause
  for each pen lift. The result is scaled to a fixed total duration.
*/

export type RouteStroke = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  nx: Float32Array;
  ny: Float32Array;
  /** How freely each point may swing (0..1): tight turns and reversals hold still, open curves give. */
  give: Float32Array;
  /** Seconds after the first touch of the pen when it reaches each point. */
  time: Float32Array;
};

export type PenRoute = {
  strokes: RouteStroke[];
  /** Seconds from the first touch to the last lift. */
  duration: number;
  /** Distance between two points, in signature units. */
  spacing: number;
};

/** Pen lifts before stroke 2, 3, 4 ("impact", the t-cross, the i-dot), in seconds. */
const LIFTS = [0.22, 0.14, 0.26];
/** Extra time spent where the pen reverses (bottom of an m, top of a t). */
const CUSP_STOP = 0.035;
/** How much a tight turn slows the pen (0: not at all). */
const CURVE_SLOW = 0.55;
/** Radius, in signature units, under which a turn counts as tight. */
const TIGHT_RADIUS = 7;
/** Turn radius, in signature units, under which a point of the string starts to hold still. */
const GIVE_RADIUS = 9;
/** Length, in signature units, of the soft start and finish of a stroke. */
const RAMP = 14;
/** Shortest time a stroke takes, so the i-dot still reads as a gesture. */
const MIN_STROKE = 0.07;

export function buildPenRoute(signature: PenSignature, totalDuration: number): PenRoute {
  const spacing = 2;
  const cost: Float32Array[] = [];
  let rawTotal = 0;

  const strokes = signature.strokes.map((stroke) => {
    const count = stroke.points.length / 2;
    const x = new Float32Array(count);
    const y = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      x[i] = stroke.points[i * 2] ?? 0;
      y[i] = stroke.points[i * 2 + 1] ?? 0;
    }
    const cusps = new Set(stroke.cusps);

    // Normals from a centred tangent (the incoming side at a reversal), then kept on one side
    // through every reversal: where the pen retraces, both passes swing together as one string.
    const nx = new Float32Array(count);
    const ny = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = cusps.has(i) ? Math.max(0, i - 2) : Math.max(0, i - 1);
      const b = cusps.has(i) ? i : Math.min(count - 1, i + 1);
      const tx = (x[b] ?? 0) - (x[a] ?? 0);
      const ty = (y[b] ?? 0) - (y[a] ?? 0);
      const len = Math.hypot(tx, ty) || 1;
      let mx = -ty / len;
      let my = tx / len;
      if (i > 0 && mx * (nx[i - 1] ?? 0) + my * (ny[i - 1] ?? 0) < 0) {
        mx = -mx;
        my = -my;
      }
      nx[i] = mx;
      ny[i] = my;
    }

    // Per-segment time cost: arc length over local speed. Curvature also sets the give.
    const speed = new Float32Array(count);
    const stiff = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - 3);
      const b = Math.min(count - 1, i + 3);
      const ax = (x[i] ?? 0) - (x[a] ?? 0);
      const ay = (y[i] ?? 0) - (y[a] ?? 0);
      const bx = (x[b] ?? 0) - (x[i] ?? 0);
      const by = (y[b] ?? 0) - (y[i] ?? 0);
      const la = Math.hypot(ax, ay);
      const lb = Math.hypot(bx, by);
      let curvature = 0;
      if (la > 0 && lb > 0) {
        const cos = Math.min(1, Math.max(-1, (ax * bx + ay * by) / (la * lb)));
        curvature = Math.acos(cos) / ((la + lb) / 2);
      }
      const tight = Math.min(1, curvature * TIGHT_RADIUS);
      stiff[i] = cusps.has(i) ? 50 : (curvature * GIVE_RADIUS) ** 2;
      const fromEnd = Math.min(i, count - 1 - i) * spacing;
      const ramp = Math.min(1, fromEnd / RAMP);
      speed[i] = (1 / (1 + CURVE_SLOW * tight)) * (0.4 + 0.6 * ramp * ramp * (3 - 2 * ramp));
    }
    // Smooth the speed so the pen never jerks.
    const smoothSpeed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let sum = 0;
      let n = 0;
      for (let j = Math.max(0, i - 6); j <= Math.min(count - 1, i + 6); j++) {
        sum += speed[j] ?? 1;
        n++;
      }
      smoothSpeed[i] = sum / n;
    }

    // Give: 1 on open curves, near 0 at reversals and in tight turns (eroded, then smoothed, so
    // a reversal holds its neighbours still too and the string never folds into a kink).
    const raw = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let low = 1;
      for (let j = Math.max(0, i - 5); j <= Math.min(count - 1, i + 5); j++) {
        low = Math.min(low, 1 / (1 + (stiff[j] ?? 0) * 2));
      }
      raw[i] = low;
    }
    const give = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      let sum = 0;
      let n = 0;
      for (let j = Math.max(0, i - 8); j <= Math.min(count - 1, i + 8); j++) {
        sum += raw[j] ?? 1;
        n++;
      }
      give[i] = sum / n;
    }

    const c = new Float32Array(count);
    for (let i = 1; i < count; i++) {
      const ds = Math.hypot((x[i] ?? 0) - (x[i - 1] ?? 0), (y[i] ?? 0) - (y[i - 1] ?? 0));
      c[i] = ds / ((smoothSpeed[i] ?? 1) + (smoothSpeed[i - 1] ?? 1)) / 0.5;
      if (cusps.has(i)) c[i] = (c[i] ?? 0) + CUSP_STOP;
    }
    cost.push(c);
    rawTotal += c.reduce((s, v) => s + v, 0);

    return { count, x, y, nx, ny, give, time: new Float32Array(count) };
  });

  // Scale the pen's speed so the drawing plus the lifts fills the requested duration.
  const lifts = LIFTS.slice(0, Math.max(0, strokes.length - 1)).reduce((s, v) => s + v, 0);
  const drawTime = Math.max(0.5, totalDuration - lifts);
  const scale = drawTime / rawTotal;

  let clock = 0;
  strokes.forEach((stroke, k) => {
    if (k > 0) clock += LIFTS[k - 1] ?? 0.2;
    const c = cost[k];
    if (!c) return;
    const own = c.reduce((s, v) => s + v, 0) * scale;
    const stretch = own < MIN_STROKE && own > 0 ? MIN_STROKE / own : 1;
    stroke.time[0] = clock;
    for (let i = 1; i < stroke.count; i++) {
      clock += (c[i] ?? 0) * scale * stretch;
      stroke.time[i] = clock;
    }
  });

  return { strokes, duration: clock, spacing };
}
