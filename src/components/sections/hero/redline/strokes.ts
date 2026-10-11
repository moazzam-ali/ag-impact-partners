/*
  Pen geometry for Redline, in the sheet's pixel space. Strokes are seeded so a given layout always
  draws the same hand: a slight overshoot, a little wobble, a drift upwards like a real strike.
*/

/** mulberry32: small, fast, deterministic. */
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

const n = (v: number) => v.toFixed(1);

/** A strike through one line fragment, from x1 to x2 at height y (the middle of the x-height). */
export function strikePath(x1: number, x2: number, y: number, lineHeight: number, seed: number) {
  const r = rng(seed);
  const sx = x1 - 1 - r() * 2;
  const ex = x2 + 1 + r() * 3;
  const len = ex - sx;
  const wobble = Math.min(1.6, lineHeight * 0.08);
  const drift = (r() - 0.65) * Math.min(3, lineHeight * 0.14);
  const steps = Math.max(1, Math.round(len / 130));
  let d = `M${n(sx)} ${n(y + (r() - 0.5) * wobble)}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = sx + len * t;
    const cx = x - len / steps / 2;
    const cy = y + drift * (t - 0.5 / steps) + (r() - 0.5) * wobble * 1.6;
    d += ` Q${n(cx)} ${n(cy)} ${n(x)} ${n(y + drift * t + (r() - 0.5) * wobble)}`;
  }
  return d;
}

/** The proofreader's caret under the point where the insertion goes. */
export function caretPath(x: number, baseline: number, size: number) {
  const w = size * 0.28;
  const h = size * 0.38;
  return `M${n(x - w)} ${n(baseline + h)} L${n(x)} ${n(baseline)} L${n(x + w)} ${n(baseline + h)}`;
}

/** One confident underline under a word set at `size` px, rising a little at the end. */
export function underlinePath(x1: number, x2: number, y: number, size: number) {
  const w = x2 - x1;
  return [
    `M${n(x1 - size * 0.04)} ${n(y + size * 0.03)}`,
    `C${n(x1 + w * 0.3)} ${n(y - size * 0.02)}`,
    `${n(x1 + w * 0.72)} ${n(y + size * 0.05)}`,
    `${n(x2 + size * 0.14)} ${n(y - size * 0.05)}`,
  ].join(" ");
}
