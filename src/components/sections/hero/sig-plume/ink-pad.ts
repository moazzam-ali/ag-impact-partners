/*
  "Sign with us": the visitor writes on the hero with a pointed nib. Each stroke's width comes from
  its direction and speed, as with a flexible steel nib: pulling down along the copperplate slant
  opens the tines (up to ~7 px), upstrokes and fast flicks close them to a hairline (~1 px). Widths
  are smoothed over distance so the line reads as ink, not a marker. A finished stroke stays for a
  moment, then fades out, so the signature is always left as the only mark.

  One canvas, device pixel ratio capped at 2. The loop runs only while the pointer is down or a
  stroke is still fading, and never while the hero is off screen.
*/

const MAX_DPR = 2;
const HAIRLINE = 1;
const SWELL = 6.2;
/** The shade direction: down and to the left along the 55° copperplate slant (screen y points down). */
const SHADE_X = -Math.cos((55 * Math.PI) / 180);
const SHADE_Y = Math.sin((55 * Math.PI) / 180);
/** Pointer speed (px/ms) at which the nib closes to a hairline. */
const FAST = 3.2;
/** Distance (px) over which width and direction settle. */
const WIDTH_EASE = 9;
const DIR_EASE = 6;
/** A stroke stays this long after the pen lifts, then fades out. */
const HOLD = 600;
const FADE = 2500;
const MAX_STROKES = 24;
/** Interpolated spacing along the stroke, in px. */
const STEP = 1.5;

type Point = { x: number; y: number; w: number };
type Stroke = { points: Point[]; endedAt: number | null };

const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function createInkPad(host: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const strokes: Stroke[] = [];
  let active: Stroke | null = null;
  let last: { x: number; y: number; t: number } | null = null;
  let dirX = 0;
  let dirY = 1;
  let width = HAIRLINE;
  let pointerId: number | null = null;
  let frame = 0;
  let visible = true;
  let dpr = 1;
  let ink = getComputedStyle(host).getPropertyValue("--accent").trim();

  const resize = () => {
    const rect = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ink = getComputedStyle(host).getPropertyValue("--accent").trim();
    draw(performance.now());
  };

  const local = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** Lays interpolated points from the last emitted point to (x, y) along a quadratic through c. */
  const emit = (c: { x: number; y: number }, x: number, y: number, goal: number) => {
    if (!active) return;
    const from = active.points[active.points.length - 1];
    if (!from) return;
    const dist = Math.hypot(c.x - from.x, c.y - from.y) + Math.hypot(x - c.x, y - c.y);
    const steps = Math.max(1, Math.ceil(dist / STEP));
    const k = 1 - Math.exp(-dist / steps / WIDTH_EASE);
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const u = 1 - f;
      width += (goal - width) * k;
      active.points.push({
        x: u * u * from.x + 2 * u * f * c.x + f * f * x,
        y: u * u * from.y + 2 * u * f * c.y + f * f * y,
        w: width,
      });
    }
  };

  /**
   * Feeds one pointer sample: updates the nib's direction and target width, then draws through the
   * previous sample with a midpoint quadratic, so the polyline of pointer events reads as one curve.
   */
  const addSample = (x: number, y: number, t: number) => {
    if (!active || !last) return;
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.75) return;
    const speed = dist / Math.max(1, t - last.t);

    const k = 1 - Math.exp(-dist / DIR_EASE);
    dirX += (dx / dist - dirX) * k;
    dirY += (dy / dist - dirY) * k;
    const dl = Math.hypot(dirX, dirY) || 1;
    const shade = Math.max(0, (dirX * SHADE_X + dirY * SHADE_Y) / dl);
    const ease = Math.min(1, Math.max(0.12, 1.1 - speed / FAST));
    const target = HAIRLINE + SWELL * shade ** 1.4 * ease;

    emit(last, (last.x + x) / 2, (last.y + y) / 2, target);
    last = { x, y, t };
  };

  /** One stroke as a single path (segments as quads plus round joins), filled once. */
  const trace = (points: Point[]) => {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!p) continue;
      const r = (p.w * dpr) / 2;
      const px = p.x * dpr;
      const py = p.y * dpr;
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
      const q = points[i + 1];
      if (!q) continue;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const rq = (q.w * dpr) / 2;
      const qx = q.x * dpr;
      const qy = q.y * dpr;
      // Same winding as the arcs (clockwise on screen), so the nonzero fill makes one shape.
      ctx.moveTo(px + nx * r, py + ny * r);
      ctx.lineTo(px - nx * r, py - ny * r);
      ctx.lineTo(qx - nx * rq, qy - ny * rq);
      ctx.lineTo(qx + nx * rq, qy + ny * rq);
      ctx.closePath();
    }
    ctx.fill("nonzero");
  };

  const draw = (now: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ink;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (!s) continue;
      const age = s.endedAt === null ? 0 : now - s.endedAt - HOLD;
      if (age > FADE) {
        strokes.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = 1 - smoothstep(age / FADE);
      trace(s.points);
    }
    ctx.globalAlpha = 1;
  };

  const tick = (now: number) => {
    frame = 0;
    draw(now);
    if (visible && (active || strokes.length > 0)) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame && visible) frame = requestAnimationFrame(tick);
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.pointerType === "touch" || pointerId !== null) return;
    e.preventDefault();
    pointerId = e.pointerId;
    host.setPointerCapture(e.pointerId);
    const { x, y } = local(e);
    active = { points: [{ x, y, w: HAIRLINE }], endedAt: null };
    strokes.push(active);
    if (strokes.length > MAX_STROKES) strokes.shift();
    last = { x, y, t: e.timeStamp };
    dirX = 0;
    dirY = 1;
    width = HAIRLINE;
    wake();
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId || !active) return;
    const events = e.getCoalescedEvents?.() ?? [];
    const samples = events.length ? events : [e];
    const rect = host.getBoundingClientRect();
    for (const s of samples) addSample(s.clientX - rect.left, s.clientY - rect.top, s.timeStamp);
  };

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    pointerId = null;
    if (active && last) {
      emit(last, last.x, last.y, HAIRLINE);
      active.endedAt = performance.now();
    }
    active = null;
    last = null;
    wake();
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) wake();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  const ro = new ResizeObserver(resize);

  resize();
  io.observe(host);
  ro.observe(host);
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onUp);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    io.disconnect();
    ro.disconnect();
    host.removeEventListener("pointerdown", onDown);
    host.removeEventListener("pointermove", onMove);
    host.removeEventListener("pointerup", onUp);
    host.removeEventListener("pointercancel", onUp);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
