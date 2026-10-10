import {
  FIL_COUNT,
  FIL_HEIGHT,
  FIL_LENGTH,
  FIL_LIFT,
  FIL_MEET,
  FIL_POINTS,
  FIL_WIDTH,
} from "./fil-geometry";

/*
  The thread as a rope: rest positions (the signature), a Verlet state for the pull, and the drawing.
  Everything is in CSS pixels of the stage. The look: three fine strands a little apart that twist
  around each other along the length, one in the accent, two in ink at reduced opacity; the twist is
  attached to the material (rest arc length), so it travels with the thread when it is pulled.
*/

export const COUNT = FIL_COUNT;
export const MEET = FIL_MEET;
const [LIFT_FROM, LIFT_TO] = FIL_LIFT;

/** Twist: wavelength along the thread and how far a strand sits from the centreline (px). */
const TWIST = 30;
const SPREAD = 1.15;
/** Strand alphas are quantised into this many levels, one path per level per strand. */
const LEVELS = 10;

export type Rope = {
  /** Rest positions: the finished signature. */
  rx: Float32Array;
  ry: Float32Array;
  /** Current and previous positions (Verlet). */
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  /** The straight line of the intro (the two sides of the table). */
  lx: Float32Array;
  ly: Float32Array;
  /** Rest distance from point i to i + 1. */
  seg: Float32Array;
  /** Rest arc length at each point (drives the twist). */
  s: Float32Array;
  /** 0–1 per point: hover brightening, eased towards `glowTo`. */
  glow: Float32Array;
  glowTo: Float32Array;
  /** 0–1 per point: how far each point has gathered from the line into the signature. */
  gather: Float32Array;
  /** Drawn or not (the intro's hairline tips, the pen lift). Multiplies alpha. */
  show: Float32Array;
};

export function createRope(): Rope {
  const f = () => new Float32Array(COUNT);
  return {
    rx: f(),
    ry: f(),
    x: f(),
    y: f(),
    px: f(),
    py: f(),
    lx: f(),
    ly: f(),
    seg: f(),
    s: f(),
    glow: f(),
    glowTo: f(),
    gather: f().fill(1),
    show: f().fill(1),
  };
}

const at = (a: Float32Array, i: number) => a[i] ?? 0;

export type Placement = {
  /** Stage size. */
  width: number;
  height: number;
  /** Centre of the signature and its width, px. */
  cx: number;
  cy: number;
  sigWidth: number;
};

/** Places the signature and the intro's straight line in the stage. */
export function placeRope(rope: Rope, p: Placement) {
  const k = p.sigWidth / FIL_WIDTH;
  for (let i = 0; i < COUNT; i++) {
    rope.rx[i] = p.cx + (FIL_POINTS[i * 2] ?? 0) * k;
    rope.ry[i] = p.cy + (FIL_POINTS[i * 2 + 1] ?? 0) * k;
  }
  let acc = 0;
  for (let i = 0; i < COUNT; i++) {
    rope.s[i] = acc;
    if (i < COUNT - 1) {
      const d = Math.hypot(
        at(rope.rx, i + 1) - at(rope.rx, i),
        at(rope.ry, i + 1) - at(rope.ry, i),
      );
      rope.seg[i] = d;
      acc += d;
    }
  }
  // The line runs edge to edge through the meeting point's height, joined at the stage's centre.
  const y = at(rope.ry, MEET);
  const mid = p.width / 2;
  const left = -24;
  const right = p.width + 24;
  for (let i = 0; i < COUNT; i++) {
    rope.lx[i] =
      i <= MEET
        ? left + ((mid - left) * i) / MEET
        : mid + ((right - mid) * (i - MEET)) / (COUNT - 1 - MEET);
    rope.ly[i] = y;
  }
}

export function signatureHeight(sigWidth: number) {
  return (FIL_HEIGHT / FIL_WIDTH) * sigWidth;
}

/** Arc length between the meeting point and the far end of the longer side, in rest px. */
export function longestSide(rope: Rope) {
  const sm = at(rope.s, MEET);
  return Math.max(sm, at(rope.s, COUNT - 1) - sm);
}

export function snapToRest(rope: Rope) {
  rope.x.set(rope.rx);
  rope.y.set(rope.ry);
  rope.px.set(rope.rx);
  rope.py.set(rope.ry);
}

/** Critically damped response from rest to 1 over u in [0, 1]: no overshoot, zero start speed. */
const OMEGA = 6;
const CRIT_END = 1 - (1 + OMEGA) * Math.exp(-OMEGA);
export function settle(u: number) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return (1 - (1 + OMEGA * u) * Math.exp(-OMEGA * u)) / CRIT_END;
}

/** Positions for the gather: each point between its place on the line and on the signature. */
export function applyGather(rope: Rope) {
  for (let i = 0; i < COUNT; i++) {
    const g = at(rope.gather, i);
    const x = at(rope.lx, i) + (at(rope.rx, i) - at(rope.lx, i)) * g;
    const y = at(rope.ly, i) + (at(rope.ry, i) - at(rope.ly, i)) * g;
    rope.x[i] = x;
    rope.y[i] = y;
    rope.px[i] = x;
    rope.py[i] = y;
  }
}

/** The pen lift is invisible once the thread lies on the page; it fades as its points arrive. */
export function liftVisibility(rope: Rope) {
  for (let i = LIFT_FROM - 3; i <= LIFT_TO + 3; i++) {
    if (i < 0 || i >= COUNT) continue;
    const edge = Math.min(i - (LIFT_FROM - 3), LIFT_TO + 3 - i) / 3;
    const hidden = Math.min(1, Math.max(0, edge));
    rope.show[i] = Math.min(at(rope.show, i), 1 - hidden * at(rope.gather, i));
  }
}

/* ---------- the pull: Verlet rope with anchored ends and a soft spring home ---------- */

const SPRING = 0.016;
const DAMPING = 0.9;
const ITERATIONS = 12;

export function stepRope(rope: Rope, grabbed: number, gx: number, gy: number) {
  const { x, y, px, py, rx, ry, seg } = rope;
  const last = COUNT - 1;
  for (let i = 1; i < last; i++) {
    if (i === grabbed) continue;
    const xi = at(x, i);
    const yi = at(y, i);
    const vx = (xi - at(px, i)) * DAMPING;
    const vy = (yi - at(py, i)) * DAMPING;
    px[i] = xi;
    py[i] = yi;
    x[i] = xi + vx + (at(rx, i) - xi) * SPRING;
    y[i] = yi + vy + (at(ry, i) - yi) * SPRING;
  }
  x[0] = at(rx, 0);
  y[0] = at(ry, 0);
  x[last] = at(rx, last);
  y[last] = at(ry, last);
  if (grabbed >= 0) {
    px[grabbed] = at(x, grabbed);
    py[grabbed] = at(y, grabbed);
    x[grabbed] = gx;
    y[grabbed] = gy;
  }
  const pinned = (i: number) => i === 0 || i === last || i === grabbed;
  for (let it = 0; it < ITERATIONS; it++) {
    const forward = it % 2 === 0;
    for (let n = 0; n < last; n++) {
      const a = forward ? n : last - 1 - n;
      const b = a + 1;
      const dx = at(x, b) - at(x, a);
      const dy = at(y, b) - at(y, a);
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) continue;
      const pa = pinned(a);
      const pb = pinned(b);
      if (pa && pb) continue;
      const diff = (d - at(seg, a)) / d;
      const wa = pa ? 0 : pb ? 1 : 0.5;
      const wb = pb ? 0 : pa ? 1 : 0.5;
      x[a] = at(x, a) + dx * diff * wa;
      y[a] = at(y, a) + dy * diff * wa;
      x[b] = at(x, b) - dx * diff * wb;
      y[b] = at(y, b) - dy * diff * wb;
    }
  }
}

/** Nearest drawn point to (qx, qy) within `radius`, or -1. */
export function nearest(rope: Rope, qx: number, qy: number, radius: number) {
  let best = -1;
  let bestD = radius * radius;
  for (let i = 1; i < COUNT - 1; i++) {
    if (at(rope.show, i) < 0.5) continue;
    const dx = at(rope.x, i) - qx;
    const dy = at(rope.y, i) - qy;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Hover: brighten the section of thread near the pointer. Returns true while still easing. */
export function updateGlow(rope: Rope, qx: number, qy: number, radius: number, active: boolean) {
  let moving = false;
  for (let i = 0; i < COUNT; i++) {
    let to = 0;
    if (active) {
      const d = Math.hypot(at(rope.x, i) - qx, at(rope.y, i) - qy);
      const u = Math.max(0, 1 - d / radius);
      to = u * u * (3 - 2 * u);
    }
    rope.glowTo[i] = to;
    const g = at(rope.glow, i);
    const next = g + (to - g) * 0.16;
    rope.glow[i] = Math.abs(to - next) < 0.004 ? to : next;
    if (rope.glow[i] !== to) moving = true;
  }
  return moving;
}

/* ---------- drawing ---------- */

export type Ink = { ink: string; accent: string };

const STRANDS = [
  { color: "accent", alpha: 0.95, width: 1.3, phase: 0 },
  { color: "ink", alpha: 0.62, width: 1, phase: (Math.PI * 2) / 3 },
  { color: "ink", alpha: 0.38, width: 1, phase: (Math.PI * 4) / 3 },
] as const;

const nx = new Float32Array(COUNT);
const ny = new Float32Array(COUNT);
const qx = new Float32Array(COUNT);
const qy = new Float32Array(COUNT);
const qa = new Float32Array(COUNT);

export function drawRope(ctx: CanvasRenderingContext2D, rope: Rope, ink: Ink, knot?: number) {
  const { x, y, s, glow, gather, show } = rope;
  const last = COUNT - 1;
  // Normals from the neighbours.
  for (let i = 0; i < COUNT; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(last, i + 1);
    const tx = at(x, b) - at(x, a);
    const ty = at(y, b) - at(y, a);
    const l = Math.hypot(tx, ty) || 1;
    nx[i] = -ty / l;
    ny[i] = tx / l;
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const strand of STRANDS) {
    const paths: Path2D[] = [];
    for (let l = 0; l < LEVELS; l++) paths.push(new Path2D());
    for (let i = 0; i < COUNT; i++) {
      const g = at(glow, i);
      // A taut line is tightly twisted; laid down it relaxes; hover lifts the strands apart.
      const spread = SPREAD * (0.3 + 0.7 * at(gather, i)) * (1 + 0.7 * g);
      const phi = (at(s, i) / TWIST) * Math.PI * 2 + strand.phase;
      const off = Math.sin(phi) * spread;
      qx[i] = at(x, i) + at(nx, i) * off;
      qy[i] = at(y, i) + at(ny, i) * off;
      // Strands passing behind are dimmer; the ends fray out.
      const depth = 0.62 + 0.38 * (0.5 + 0.5 * Math.cos(phi));
      const end = Math.min(1, Math.min(i, last - i) / 10);
      const lift = strand.color === "ink" ? 1 + 0.9 * g : 1 + 0.15 * g;
      qa[i] = Math.min(1, strand.alpha * depth * lift) * end * at(show, i);
    }
    for (let i = 0; i < last; i++) {
      const a = (at(qa, i) + at(qa, i + 1)) / 2;
      if (a <= 0.01) continue;
      const level = Math.min(LEVELS - 1, Math.round(a * (LEVELS - 1)));
      const path = paths[level];
      if (!path) continue;
      // Quadratic through the midpoints: smooth at any spacing.
      const x0 = i === 0 ? at(qx, 0) : (at(qx, i - 1) + at(qx, i)) / 2;
      const y0 = i === 0 ? at(qy, 0) : (at(qy, i - 1) + at(qy, i)) / 2;
      const x1 = (at(qx, i) + at(qx, i + 1)) / 2;
      const y1 = (at(qy, i) + at(qy, i + 1)) / 2;
      path.moveTo(x0, y0);
      path.quadraticCurveTo(at(qx, i), at(qy, i), x1, y1);
      if (i === last - 1) path.lineTo(at(qx, last), at(qy, last));
    }
    ctx.strokeStyle = strand.color === "accent" ? ink.accent : ink.ink;
    ctx.lineWidth = strand.width;
    for (let l = 1; l < LEVELS; l++) {
      const path = paths[l];
      if (!path) continue;
      ctx.globalAlpha = l / (LEVELS - 1);
      ctx.stroke(path);
    }
  }
  ctx.globalAlpha = 1;
  if (knot && knot > 0.01) {
    ctx.fillStyle = ink.accent;
    ctx.beginPath();
    ctx.arc(at(x, MEET), at(y, MEET), 3.2 * knot, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const THREAD_LENGTH = FIL_LENGTH;
