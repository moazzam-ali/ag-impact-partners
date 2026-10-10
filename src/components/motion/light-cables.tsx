"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

/*
  Light Cables, adapted from Originkit's component. A full-area fragment shader draws a bundle of
  glowing cables with travelling pulses that bend towards the pointer.

  Changes from the original: sized by CSS (no fixed minimum size); colours default to the host's
  --cables-* tokens; the loop only runs while the host is on screen; prefers-reduced-motion renders
  one still frame and ignores the pointer; device pixel ratio is capped. The fragment shader gained
  three controls: a static curve (`curve`, the same pull the pointer applies, so the bundle has a
  shape without hover, with the same glow surge), `feedIn` / `feedOut` (where the cables light up
  from the tip and where the tail fades) and `originGlow` (how bright the converging tip is).
  The context is not released on unmount on purpose: React's dev double-mount would get the same,
  lost context back from the canvas; the canvas leaves the DOM with the component anyway.
*/

const MAX_DPR = 1.5;
const MAX_CABLES = 48;
const GRAIN = 0.012;

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;
uniform vec3  uBg;
uniform vec3  uBase;
uniform vec3  uAccent;
uniform vec3  uHigh;
uniform float uCount;
uniform float uBend;
uniform float uSpread;
uniform float uWStart;
uniform float uWEnd;
uniform float uAxis;
uniform float uDir;
uniform float uPosX;
uniform float uPosY;
uniform float uThick;
uniform float uFlow;
uniform float uPulses;
uniform float uGrab;
uniform float uGrain;
uniform vec2  uCurve;
uniform float uCurveAmt;
uniform float uCurveWidth;
uniform float uFeedIn;
uniform float uFeedOut;
uniform float uOriginGlow;

float sat(float x) { return clamp(x, 0.0, 1.0); }

float h21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y);
}

float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = h21(i), b = h21(i + vec2(1.0, 0.0));
    float c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm5(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return s;
}

float fbm3(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.07 + vec2(4.1, 2.3); a *= 0.5; }
    return s;
}

void main() {
    float ar = uRes.x / max(uRes.y, 1.0);
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 p = (uv - 0.5) * vec2(ar, 1.0);
    float t = uTime;

    vec2 pAdj = p - vec2(uPosX * ar, uPosY) * 0.5;

    vec3 col = uBg;
    vec2 sm = p - vec2(-0.05, -0.28);
    col += uBase * exp(-pow(length(sm * vec2(0.75, 1.9)) / 0.42, 1.7)) * 0.50
         * (0.6 + 0.6 * fbm3(p * 2.4 + vec2(t * 0.05, 0.0)));

    float extent = mix(ar, 1.0, uAxis);
    float along = mix(pAdj.x, pAdj.y, uAxis) * uDir;
    float across = mix(pAdj.y, pAdj.x, uAxis);

    float s01 = sat((along + extent * 0.5) / max(extent, 0.001));
    vec2 ptrRaw = (uMouse - 0.5) * vec2(ar, 1.0);
    float ptrAlong = mix(ptrRaw.x, ptrRaw.y, uAxis) * uDir;
    float ptrAcross = mix(ptrRaw.y, ptrRaw.x, uAxis);
    vec2 cvRaw = (uCurve - 0.5) * vec2(ar, 1.0);
    float cvAlong = mix(cvRaw.x, cvRaw.y, uAxis) * uDir;
    float cvAcross = mix(cvRaw.y, cvRaw.x, uAxis);

    float kAlong = -0.18;
    float kAcross = 0.10;
    vec3 acc = vec3(0.0);
    float surge = 0.0;
    float surgeC = 0.0;

    for (int i = 0; i < 48; i++) {
        if (float(i) >= uCount) break;
        float fi = float(i) / max(uCount - 1.0, 1.0);
        float o = fi - 0.5;
        float rnd = h21(vec2(fi * 7.31, 2.0));

        float kAlongi = kAlong + o * 0.10 + (rnd - 0.5) * 0.03;
        float bi = uBend * (0.88 + 0.24 * rnd);
        float spread = uSpread * mix(uWStart, uWEnd, s01) * (0.090 + 0.34 * sat((along - kAlong) * 0.85 + 0.25));
        float bendAlong = sqrt((along - kAlongi) * (along - kAlongi) + 0.0035);
        float yy = kAcross + o * spread - bi * bendAlong + 0.008 * sin(along * 3.0 + fi * 19.0);

        float cx = exp(-pow((along - cvAlong) / max(uCurveWidth * 0.30, 0.02), 2.0));
        yy = mix(yy, cvAcross + o * spread * 0.55, cx * 0.60 * uCurveAmt);

        float gx = exp(-pow((along - ptrAlong) / max(uGrab * 0.30, 0.02), 2.0));
        yy = mix(yy, ptrAcross + o * spread * 0.55, gx * 0.60 * uHover);

        float dd = (across - yy) / (uThick * 0.0038);
        float core = 1.0 / (1.0 + dd * dd * 9.0);
        float sheath = 1.0 / (1.0 + dd * dd * 0.6);

        float ph = s01 * uPulses - t * uFlow * 0.55 - rnd * 0.22;
        float f = fract(ph);
        float pulse = exp(-pow((f - 0.55) / 0.15, 2.0));
        float w = (0.22 + 1.60 * pulse) * (0.55 + 0.45 * rnd);

        acc += (uHigh * core * 1.45 + uAccent * sheath * 0.20) * w;
        surge += core * gx;
        surgeC += core * cx;
    }

    float feed = smoothstep(0.0, uFeedIn, s01) * smoothstep(1.02, uFeedOut, s01);
    col += acc * feed * 0.20 * mix(uOriginGlow, 1.0, smoothstep(0.0, 0.4, s01));
    col += uHigh * (surge * uHover + surgeC * uCurveAmt) * 0.05;
    col += (h21(gl_FragCoord.xy + fract(uTime) * 71.0) - 0.5) * uGrain;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

type Rgb = [number, number, number];

function parseColor(input: string | undefined, fallback: Rgb): Rgb {
  if (!input) return fallback;
  const str = input.trim();
  if (str.charAt(0) === "#") {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.charAt(0).repeat(2) + hex.charAt(1).repeat(2) + hex.charAt(2).repeat(2);
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b))
        return [r / 255, g / 255, b / 255];
    }
    return fallback;
  }
  const m = str.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    const c = (i: number) => Math.min(255, parseFloat(m[i] ?? "0")) / 255;
    return [c(0), c(1), c(2)];
  }
  return fallback;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("LightCables shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

type Bundle = {
  count: number;
  bend: number;
  spread: number;
  thickness: number;
  widthStart: number;
  widthEnd: number;
};
type Flow = { flow: number; pulses: number };
/** A standing bend: the bundle is pulled towards (x, y) in 0–1 viewport fractions, from the top-left. */
type Curve = { x: number; y: number; amount: number; width: number };

const BUNDLE_DEFAULTS: Bundle = {
  count: 48,
  bend: 0,
  spread: 89,
  thickness: 220,
  widthStart: 0,
  widthEnd: 300,
};
const FLOW_DEFAULTS: Flow = { flow: 300, pulses: 1 };
const CURVE_DEFAULTS: Curve = { x: 0.5, y: 0.5, amount: 0, width: 100 };

export type LightCablesProps = {
  className?: string;
  /** Colours default to the host's --cables-bg, --cables-base, --cables-accent, --cables-highlight. */
  background?: string;
  baseColor?: string;
  accentColor?: string;
  highlight?: string;
  /** 0–100 */
  speed?: number;
  /** 0–200, how much the bundle follows the pointer */
  hover?: number;
  /** 10–300, radius of the pointer's pull */
  grab?: number;
  direction?: "ltr" | "rtl" | "ttb" | "btt";
  /** −100…100 */
  positionX?: number;
  positionY?: number;
  bundle?: Partial<Bundle>;
  flow?: Partial<Flow>;
  /** Standing bend; `amount` 0–100, `width` 10–300 (like `grab`). Off by default. */
  curve?: Partial<Curve>;
  /** 0–1, fraction of the length over which the cables light up from the tip. Default 0.09. */
  feedIn?: number;
  /** 0–1, where the tail starts fading towards the far end. Default 0.3. */
  feedOut?: number;
  /** 0–1, brightness where the cables converge. Default 1. */
  originGlow?: number;
};

type Settings = {
  colors: { bg?: string; base?: string; accent?: string; high?: string };
  speed: number;
  hover: number;
  count: number;
  bend: number;
  spread: number;
  thickness: number;
  wStart: number;
  wEnd: number;
  flow: number;
  pulses: number;
  grab: number;
  axis: number;
  dir: number;
  posX: number;
  posY: number;
  curveX: number;
  curveY: number;
  curveAmt: number;
  curveWidth: number;
  feedIn: number;
  feedOut: number;
  originGlow: number;
};

export function LightCables({
  className,
  background,
  baseColor,
  accentColor,
  highlight,
  speed = 34,
  hover = 114,
  grab = 100,
  direction = "ttb",
  positionX = -13,
  positionY = -21,
  bundle,
  flow,
  curve,
  feedIn = 0.09,
  feedOut = 0.3,
  originGlow = 1,
}: LightCablesProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<Settings | null>(null);

  const b = { ...BUNDLE_DEFAULTS, ...bundle };
  const f = { ...FLOW_DEFAULTS, ...flow };
  const c = { ...CURVE_DEFAULTS, ...curve };

  // Settings live in a ref so the render loop reads the latest props without restarting.
  useEffect(() => {
    settingsRef.current = {
      colors: { bg: background, base: baseColor, accent: accentColor, high: highlight },
      speed: clamp(speed, 0, 100) / 50,
      hover: clamp(hover, 0, 200) / 100,
      count: Math.round(clamp(b.count, 4, MAX_CABLES)),
      bend: clamp(b.bend, 0, 150) / 100,
      spread: clamp(b.spread, 10, 300) / 100,
      thickness: clamp(b.thickness, 20, 400) / 100,
      wStart: clamp(b.widthStart, 0, 300) / 100,
      wEnd: clamp(b.widthEnd, 0, 300) / 100,
      flow: clamp(f.flow, 0, 300) / 100,
      pulses: clamp(f.pulses, 1, 12),
      grab: clamp(grab, 10, 300) / 100,
      axis: direction === "ttb" || direction === "btt" ? 1 : 0,
      dir: direction === "rtl" || direction === "ttb" ? -1 : 1,
      posX: clamp(positionX, -100, 100) / 100,
      posY: clamp(positionY, -100, 100) / 100,
      curveX: clamp(c.x, 0, 1),
      curveY: clamp(c.y, 0, 1),
      curveAmt: clamp(c.amount, 0, 100) / 100,
      curveWidth: clamp(c.width, 10, 300) / 100,
      feedIn: clamp(feedIn, 0.005, 1),
      feedOut: clamp(feedOut, 0, 1),
      originGlow: clamp(originGlow, 0, 1),
    };
  }, [
    background,
    baseColor,
    accentColor,
    highlight,
    speed,
    hover,
    grab,
    direction,
    positionX,
    positionY,
    b.count,
    b.bend,
    b.spread,
    b.thickness,
    b.widthStart,
    b.widthEnd,
    f.flow,
    f.pulses,
    c.x,
    c.y,
    c.amount,
    c.width,
    feedIn,
    feedOut,
    originGlow,
  ]);

  useEffect(() => {
    const el = host.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false });
    if (!gl || gl.isContextLost()) return; // The plain background remains; the hero still reads.

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("LightCables link:", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const locations = new Map<string, WebGLUniformLocation | null>();
    const u = (name: string) => {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name) ?? null;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 };
    let raf = 0;
    let running = false;
    let visible = false;
    let last = performance.now();
    let clock = 0;

    const resolveColors = () => {
      const s = settingsRef.current;
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim() || undefined;
      return {
        bg: parseColor(s?.colors.bg ?? token("--cables-bg"), [0, 0, 0]),
        base: parseColor(s?.colors.base ?? token("--cables-base"), [0, 0, 0]),
        accent: parseColor(s?.colors.accent ?? token("--cables-accent"), [0.867, 0.49, 0.341]),
        high: parseColor(s?.colors.high ?? token("--cables-highlight"), [0.941, 0.643, 0.494]),
      };
    };

    const draw = (now: number) => {
      const s = settingsRef.current;
      if (!s) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock = (clock + dt * s.speed) % 3600;

      const k = 1 - Math.exp(-6 * dt);
      pointer.on += (pointer.onTarget - pointer.on) * k;
      pointer.x += ((pointer.onTarget > 0 ? pointer.tx : 0.5) - pointer.x) * k;
      pointer.y += ((pointer.onTarget > 0 ? pointer.ty : 0.5) - pointer.y) * k;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const bw = Math.max(1, Math.round((canvas.clientWidth || 1) * dpr));
      const bh = Math.max(1, Math.round((canvas.clientHeight || 1) * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      const c = resolveColors();
      gl.uniform2f(u("uRes"), bw, bh);
      gl.uniform1f(u("uTime"), clock);
      gl.uniform2f(u("uMouse"), pointer.x, 1 - pointer.y);
      gl.uniform1f(u("uHover"), Math.min(1, pointer.on) * s.hover);
      gl.uniform3f(u("uBg"), c.bg[0], c.bg[1], c.bg[2]);
      gl.uniform3f(u("uBase"), c.base[0], c.base[1], c.base[2]);
      gl.uniform3f(u("uAccent"), c.accent[0], c.accent[1], c.accent[2]);
      gl.uniform3f(u("uHigh"), c.high[0], c.high[1], c.high[2]);
      gl.uniform1f(u("uCount"), s.count);
      gl.uniform1f(u("uBend"), s.bend);
      gl.uniform1f(u("uSpread"), s.spread);
      gl.uniform1f(u("uWStart"), s.wStart);
      gl.uniform1f(u("uWEnd"), s.wEnd);
      gl.uniform1f(u("uAxis"), s.axis);
      gl.uniform1f(u("uDir"), s.dir);
      gl.uniform1f(u("uPosX"), s.posX);
      gl.uniform1f(u("uPosY"), s.posY);
      gl.uniform1f(u("uThick"), s.thickness);
      gl.uniform1f(u("uFlow"), s.flow);
      gl.uniform1f(u("uPulses"), s.pulses);
      gl.uniform1f(u("uGrab"), s.grab);
      gl.uniform1f(u("uGrain"), GRAIN);
      gl.uniform2f(u("uCurve"), s.curveX, 1 - s.curveY);
      gl.uniform1f(u("uCurveAmt"), s.curveAmt);
      gl.uniform1f(u("uCurveWidth"), s.curveWidth);
      gl.uniform1f(u("uFeedIn"), s.feedIn);
      gl.uniform1f(u("uFeedOut"), s.feedOut);
      gl.uniform1f(u("uOriginGlow"), s.originGlow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      if (running) raf = requestAnimationFrame(loop);
    };
    const setRunning = (next: boolean) => {
      if (reduced) return;
      if (next === running) return;
      running = next;
      cancelAnimationFrame(raf);
      if (running) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const track = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      pointer.tx = clamp((e.clientX - r.left) / r.width, 0, 1);
      pointer.ty = clamp((e.clientY - r.top) / r.height, 0, 1);
      pointer.onTarget = 1;
    };
    const leave = () => {
      pointer.onTarget = 0;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        setRunning(visible);
      },
      { threshold: 0 },
    );
    observer.observe(el);

    const resize = new ResizeObserver(() => {
      if (!running) draw(performance.now());
    });
    resize.observe(canvas);

    if (!reduced) {
      el.addEventListener("pointermove", track);
      el.addEventListener("pointerenter", track);
      el.addEventListener("pointerleave", leave);
    }
    draw(performance.now());

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      resize.disconnect();
      el.removeEventListener("pointermove", track);
      el.removeEventListener("pointerenter", track);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={host} className={cn("relative overflow-hidden", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
