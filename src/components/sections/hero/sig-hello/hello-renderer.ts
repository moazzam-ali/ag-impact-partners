import { HELLO_SIGNATURE } from "./hello-geometry";
import { buildPenRoute, type PenRoute } from "./pen-route";
import { StringWave } from "./string-wave";

/*
  Draws the "hello" signature on a canvas that fills the hero, and runs the plucked-string
  interaction. Owns its own rAF loop, which only runs while the string moves and the hero is on
  screen; the intro clock is pushed in from GSAP (setClock).

  Colour: the line is var(--ink). Two quiet nods to Apple's hello, which shifts colour along its
  stroke: freshly written ink starts warm (towards --accent) and cools to --ink in under a
  second, and a vibrating stretch of string warms slightly with its amplitude. At rest, and in every
  still, the signature is plain --ink.
*/

/** Pen-to-finish duration of the drawing, seconds. */
export const DRAW_DURATION = 3.5;
/** How long fresh ink takes to cool from warm to --ink (time constant, seconds). */
export const COOL_TIME = 0.26;

/** Signature width as a share of the frame (min(viewport, 1512)). */
const WIDTH_SHARE = 0.62;
/** Pen weight relative to the design width (about 8.8 px at 1512). */
const PEN_WEIGHT = 1.1;
/** Warmth of the pen tip (0..1 mix towards --accent) and of a vibrating string. */
const TIP_WARMTH = 0.6;
const STRING_WARMTH = 0.4;
/** Displacement, in signature units, at which a vibrating point is fully warm. */
const WARM_AT = 5;
/** Colour steps between --ink and --accent; runs of the same step are drawn as one path. */
const LEVELS = 12;
/** Pointer reach (signature units), pluck strength and speed cap (signature units / s). */
const REACH = 26;
const GAIN = 2.6;
const MAX_POINTER_SPEED = 2600;
const MAX_DPR = 2;

type Rgb = [number, number, number];

export type HelloRenderer = {
  /** Intro clock in seconds since the pen first touches; Infinity = finished. */
  setClock: (t: number) => void;
  /** Start listening to the pointer (after the drawing). */
  enableInteraction: () => void;
  destroy: () => void;
  route: PenRoute;
};

export function createHelloRenderer(canvas: HTMLCanvasElement): HelloRenderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const section = canvas.closest("section");
  const route = buildPenRoute(HELLO_SIGNATURE, DRAW_DURATION);
  const waves = route.strokes.map((s) => new StringWave(s.count, route.spacing));
  const glow = route.strokes.map((s) => new Float32Array(s.count));

  let clock = 0;
  let dpr = 1;
  let scale = 1;
  let originX = 0;
  let originY = 0;
  let palette: string[] = [];
  let frame = 0;
  let visible = true;
  let interactive = false;
  let lastTick = 0;
  // Pointer, in client pixels; consumed once per frame.
  let pointer: { x: number; y: number; t: number } | null = null;
  let lastPointer: { x: number; y: number; t: number } | null = null;

  const readPalette = () => {
    const style = getComputedStyle(canvas);
    const ink = toRgb(ctx, style.getPropertyValue("--ink"), [244, 241, 236]);
    const accent = toRgb(ctx, style.getPropertyValue("--accent"), [244, 176, 123]);
    palette = Array.from({ length: LEVELS }, (_, i) => {
      const m = i / (LEVELS - 1);
      const c = ink.map((v, k) => Math.round(v + ((accent[k] ?? v) - v) * m));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    });
  };

  const layout = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));

    const frameWidth = Math.min(rect.width, 1512);
    const width = frameWidth * WIDTH_SHARE;
    scale = width / HELLO_SIGNATURE.width;

    // Centre the x-height band between the two headline lines (measured), else the stage.
    let mid = rect.height / 2;
    const t1 = section?.querySelector('[data-title="1"]')?.getBoundingClientRect();
    const t2 = section?.querySelector('[data-title="2"]')?.getBoundingClientRect();
    if (t1 && t2 && t2.top > t1.bottom) mid = (t1.bottom + t2.top) / 2 - rect.top;
    const baselineY = mid + (HELLO_SIGNATURE.xHeight * scale) / 2;
    originX = (rect.width - width) / 2;
    originY = baselineY - HELLO_SIGNATURE.baseline * scale;
  };

  const render = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * originX, dpr * originY);
    ctx.lineWidth = HELLO_SIGNATURE.stroke * PEN_WEIGHT;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    route.strokes.forEach((stroke, k) => {
      const wave = waves[k];
      const { count, x, y, nx, ny, give, time } = stroke;
      if ((time[0] ?? 0) > clock) return;
      const u = wave?.u;
      const still = !u || wave.resting;
      const env = glow[k];
      if (!still && env) wave.envelope(env);

      let runLevel = -1;
      let px = 0;
      let py = 0;
      for (let i = 0; i < count; i++) {
        const ti = time[i] ?? 0;
        let qx: number;
        let qy: number;
        let warm: number;
        let last = false;
        if (ti <= clock) {
          const ui = still ? 0 : (u[i] ?? 0) * (give[i] ?? 1);
          qx = (x[i] ?? 0) + ui * (nx[i] ?? 0);
          qy = (y[i] ?? 0) + ui * (ny[i] ?? 0);
          warm = Math.max(
            TIP_WARMTH * Math.exp(-(clock - ti) / COOL_TIME),
            still ? 0 : STRING_WARMTH * Math.min(1, (env?.[i] ?? 0) / WARM_AT),
          );
        } else {
          // The pen tip, between the last reached point and the next one.
          const t0 = time[i - 1] ?? ti;
          const f = ti > t0 ? (clock - t0) / (ti - t0) : 0;
          qx = px + ((x[i] ?? 0) - (x[i - 1] ?? 0)) * f;
          qy = py + ((y[i] ?? 0) - (y[i - 1] ?? 0)) * f;
          warm = TIP_WARMTH;
          last = true;
        }
        const level = Math.min(LEVELS - 1, Math.round(warm * (LEVELS - 1)));
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          runLevel = level;
        } else if (level !== runLevel) {
          ctx.lineTo(qx, qy);
          ctx.strokeStyle = palette[runLevel] ?? palette[0] ?? "#fff";
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          runLevel = level;
        } else {
          ctx.lineTo(qx, qy);
        }
        px = qx;
        py = qy;
        if (last) break;
      }
      // A stroke that has only just started still shows as a dot.
      if (count > 1 && (time[1] ?? 0) > clock) ctx.lineTo(px + 0.01, py);
      ctx.strokeStyle = palette[runLevel] ?? palette[0] ?? "#fff";
      ctx.stroke();
    });
  };

  const toLocal = (cx: number, cy: number, rect: DOMRect) => ({
    x: (cx - rect.left - originX) / scale,
    y: (cy - rect.top - originY) / scale,
  });

  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(0.033, lastTick ? (now - lastTick) / 1000 : 1 / 60);
    lastTick = now;

    if (interactive && pointer && lastPointer && pointer !== lastPointer) {
      const rect = canvas.getBoundingClientRect();
      const a = toLocal(lastPointer.x, lastPointer.y, rect);
      const b = toLocal(pointer.x, pointer.y, rect);
      const span = Math.max(0.008, (pointer.t - lastPointer.t) / 1000);
      let vx = (b.x - a.x) / span;
      let vy = (b.y - a.y) / span;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_POINTER_SPEED) {
        vx *= MAX_POINTER_SPEED / speed;
        vy *= MAX_POINTER_SPEED / speed;
      }
      route.strokes.forEach((s, k) =>
        waves[k]?.pluck(
          { x0: a.x, y0: a.y, x1: b.x, y1: b.y, vx, vy, radius: REACH, gain: GAIN },
          s.x,
          s.y,
          s.nx,
          s.ny,
        ),
      );
    }
    lastPointer = pointer;

    let moving = false;
    for (const w of waves) if (w.step(dt)) moving = true;
    render();
    if (moving && visible) request();
    else lastTick = 0;
  };

  const request = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    if (!lastPointer) lastPointer = pointer;
    if (visible) request();
  };
  const onLeave = () => {
    pointer = null;
    lastPointer = null;
  };

  readPalette();
  layout();
  render();

  const resize = new ResizeObserver(() => {
    layout();
    render();
  });
  resize.observe(canvas);

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible && waves.some((w) => !w.resting)) request();
  });
  io.observe(canvas);

  // The headline's web font can move the lines the signature centres between.
  let alive = true;
  void document.fonts?.ready.then(() => {
    if (!alive) return;
    layout();
    render();
  });

  return {
    route,
    setClock(t) {
      clock = t;
      if (!frame) render();
    },
    enableInteraction() {
      if (interactive || !section) return;
      interactive = true;
      section.addEventListener("pointermove", onMove);
      section.addEventListener("pointerleave", onLeave);
    },
    destroy() {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resize.disconnect();
      io.disconnect();
      section?.removeEventListener("pointermove", onMove);
      section?.removeEventListener("pointerleave", onLeave);
    },
  };
}

/** Normalise any CSS colour to RGB through the canvas parser (tokens are hex today). */
function toRgb(ctx: CanvasRenderingContext2D, value: string, fallback: Rgb): Rgb {
  const v = value.trim();
  if (!v) return fallback;
  ctx.fillStyle = "#000";
  ctx.fillStyle = v;
  const parsed = String(ctx.fillStyle);
  const hex = /^#([0-9a-f]{6})$/i.exec(parsed);
  if (hex?.[1]) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = /rgba?\(([^)]+)\)/.exec(parsed);
  if (rgb?.[1]) {
    const [r, g, b] = rgb[1].split(",").map((s) => parseFloat(s));
    if (r !== undefined && g !== undefined && b !== undefined) return [r, g, b];
  }
  return fallback;
}
