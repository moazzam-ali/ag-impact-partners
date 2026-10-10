import { SCEAU_GLYPHS, SCEAU_VIEWBOX } from "./sceau-geometry";

/*
  The blind emboss. The signature's fill is rendered once into an offscreen canvas, blurred into a
  height field (a tight blur for a crisp shoulder plus a wide one for the soft give of pressed
  paper), and its gradient is packed into a texture. A fragment shader lights that relief, plus a
  faint paper tooth over the whole band, with one directional light: a diffuse term relative to flat
  paper (so untouched paper keeps exactly --bg), a short cast shadow on the side away from the light
  and a restrained sheen. Shadows are --ink at low alpha; highlights go a touch lighter than --bg.

  The canvas only draws when something changes (rise, light, size) and only while on screen. The
  pointer moves the light once interaction is switched on; the light eases towards it and the loop
  stops when it arrives. The context is not lost on purpose on unmount: React's dev double-mount
  would get the same, lost context back from the canvas.
*/

const MAX_DPR = 2;
/** Light that eases after the pointer (seconds, time constant). */
const FOLLOW_LAG = 0.15;
/** Slower return to rest when the pointer leaves or idles. */
const REST_LAG = 0.7;
const IDLE_AFTER = 3200;
/** Elevation when the pointer is over the centre of the signature, and when it is far away. */
const EL_NEAR = (68 * Math.PI) / 180;
const EL_FAR = (15 * Math.PI) / 180;
/** CSS px of margin around the signature in the height map (room for blur and shadow). */
const MAP_PAD = 16;

export type LightAngles = { az: number; el: number };
/** Rest light: from the top-left, fairly low so the relief reads. az 0 = from the right, π/2 = top. */
export const REST_LIGHT: LightAngles = { az: (138 * Math.PI) / 180, el: (30 * Math.PI) / 180 };

export type Relief = {
  setRise: (rise: number) => void;
  setLight: (light: LightAngles) => void;
  setInteractive: (on: boolean) => void;
  destroy: () => void;
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float uDpr;
uniform sampler2D uMap;
uniform vec4 uRect;
uniform float uGrad;
uniform vec3 uLight;
uniform float uRise;
uniform vec3 uBg;
uniform vec3 uInk;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Paper tooth: fine grain, short fibres along a shallow diagonal, a slow cloud.
float paper(vec2 p) {
  vec2 q = vec2(p.x * 0.94 + p.y * 0.34, p.y * 0.94 - p.x * 0.34);
  float fibre = vnoise(q * vec2(0.22, 1.1));
  float tooth = vnoise(p * 0.62 + 11.0);
  float cloud = vnoise(p * 0.035 + 3.0);
  return tooth * 0.55 + fibre * 0.35 + cloud * 0.9;
}

vec3 sampleMap(vec2 fc) {
  vec2 uv = (fc - uRect.xy) / uRect.zw;
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0) return vec3(0.5, 0.5, 0.0);
  return texture2D(uMap, uv).rgb;
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 css = fc / uDpr;
  vec3 m = sampleMap(fc);
  vec2 g = (m.rg * 2.0 - 1.0) * uGrad * uRise;
  float h = m.b * uRise;

  float e = 0.8;
  float p0 = paper(css);
  vec2 pg = vec2(paper(css + vec2(e, 0.0)) - p0, paper(css + vec2(0.0, e)) - p0) / e;

  vec3 n = normalize(vec3(-(g * 2.6 + pg * 0.07), 1.0));
  vec3 L = uLight;
  float lit = dot(n, L) - L.z;

  vec2 toward = L.xy / max(length(L.xy), 1e-3);
  float reach = (1.0 + 3.0 * (1.0 - L.z)) * uDpr;
  float occl = max(sampleMap(fc + toward * reach).b * uRise - h, 0.0);

  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float sheen = max(pow(max(dot(n, H), 0.0), 36.0) - pow(H.z, 36.0), 0.0);

  float shade = clamp(-lit * 0.5 + occl * 0.24, 0.0, 0.36);
  float light = clamp(lit * 0.95 + sheen * 0.5, 0.0, 1.0);
  vec3 col = mix(uBg, uInk, shade);
  col = mix(col, vec3(1.0), light);
  col += (hash(fc + 7.0) - 0.5) * 0.006;
  gl_FragColor = vec4(col, 1.0);
}
`;

type Rgb = [number, number, number];

function parseColor(input: string, fallback: Rgb): Rgb {
  const str = input.trim();
  if (str.startsWith("#")) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
    if (hex.length >= 6) {
      const v = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      if (v.every((c) => !Number.isNaN(c))) return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    }
    return fallback;
  }
  const m = str.match(/[\d.]+/g);
  if (m && m.length >= 3) return [0, 1, 2].map((i) => Number(m[i] ?? 0) / 255) as Rgb;
  return fallback;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Sceau shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Gaussian-ish blur: three box passes per axis (sliding sums), in place on a copy. */
function blur(src: Float32Array, w: number, h: number, sigma: number) {
  const out = src.slice();
  const tmp = new Float32Array(src.length);
  const ideal = Math.sqrt((12 * sigma * sigma) / 3 + 1);
  let wl = Math.floor(ideal);
  if (wl % 2 === 0) wl--;
  const mIdeal = (12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4);
  const m = Math.round(mIdeal);
  for (let pass = 0; pass < 3; pass++) {
    const r = Math.max(0, ((pass < m ? wl : wl + 2) - 1) / 2);
    boxH(out, tmp, w, h, r);
    boxV(tmp, out, w, h, r);
  }
  return out;
}

function boxH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))] ?? 0;
    for (let x = 0; x < w; x++) {
      dst[row + x] = acc * k;
      acc += (src[row + Math.min(w - 1, x + r + 1)] ?? 0) - (src[row + Math.max(0, x - r)] ?? 0);
    }
  }
}

function boxV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const k = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += src[Math.min(h - 1, Math.max(0, y)) * w + x] ?? 0;
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = acc * k;
      acc +=
        (src[Math.min(h - 1, y + r + 1) * w + x] ?? 0) - (src[Math.max(0, y - r) * w + x] ?? 0);
    }
  }
}

const toVector = ({ az, el }: LightAngles): Rgb => [
  Math.cos(el) * Math.cos(az),
  Math.cos(el) * Math.sin(az),
  Math.sin(el),
];

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Starts the relief on `canvas` (filling `host`) for the signature drawn in `art`. Returns null when
 * WebGL is unavailable: the caller keeps the ink signature instead.
 */
export function createRelief(host: HTMLElement, canvas: HTMLCanvasElement, art: SVGSVGElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
  });
  if (!gl || gl.isContextLost()) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Sceau link:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const loc = {
    dpr: u("uDpr"),
    map: u("uMap"),
    rect: u("uRect"),
    grad: u("uGrad"),
    light: u("uLight"),
    rise: u("uRise"),
    bg: u("uBg"),
    ink: u("uInk"),
  };
  gl.uniform1i(loc.map, 0);

  const glyphs = SCEAU_GLYPHS.map((d) => new Path2D(d));
  const state = {
    rise: 0,
    light: toVector(REST_LIGHT),
    target: toVector(REST_LIGHT),
    lag: FOLLOW_LAG,
    aiming: false,
    interactive: false,
    visible: true,
    dpr: 1,
    rect: [0, 0, 1, 1] as [number, number, number, number],
    grad: 1,
    bg: [0.949, 0.949, 0.933] as Rgb,
    ink: [0.098, 0.102, 0.137] as Rgb,
  };
  const pointer = { inside: false, x: 0, y: 0, moved: 0 };
  let raf = 0;
  let lastFrame = 0;
  let idleTimer = 0;
  let destroyed = false;

  /** Renders the signature's fill, blurs it into heights, packs the gradient, uploads it. */
  const buildMap = () => {
    const box = canvas.getBoundingClientRect();
    const sig = art.getBoundingClientRect();
    if (box.width < 1 || box.height < 1 || sig.width < 1) return;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    state.dpr = dpr;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);

    const left = sig.left - box.left - MAP_PAD;
    const top = sig.top - box.top - MAP_PAD;
    const w = Math.ceil((sig.width + MAP_PAD * 2) * dpr);
    const h = Math.ceil((sig.height + MAP_PAD * 2) * dpr);
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const s = (sig.width / SCEAU_VIEWBOX.width) * dpr;
    ctx.setTransform(s, 0, 0, s, MAP_PAD * dpr, MAP_PAD * dpr);
    for (const p of glyphs) ctx.fill(p);
    const rgba = ctx.getImageData(0, 0, w, h).data;

    const fill = new Float32Array(w * h);
    for (let i = 0; i < fill.length; i++) fill[i] = (rgba[i * 4 + 3] ?? 0) / 255;
    const tight = blur(fill, w, h, 0.95 * dpr);
    const wide = blur(fill, w, h, 3.2 * dpr);
    const height = new Float32Array(w * h);
    for (let i = 0; i < height.length; i++)
      height[i] = (tight[i] ?? 0) * 0.78 + (wide[i] ?? 0) * 0.22;

    // Gradient in height per CSS px, y up (GL). Rows are flipped on upload.
    const gx = new Float32Array(w * h);
    const gy = new Float32Array(w * h);
    let gmax = 1e-6;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const dx =
          (height[y * w + Math.min(w - 1, x + 1)] ?? 0) - (height[y * w + Math.max(0, x - 1)] ?? 0);
        const dy =
          (height[Math.max(0, y - 1) * w + x] ?? 0) - (height[Math.min(h - 1, y + 1) * w + x] ?? 0);
        gx[i] = dx * 0.5 * dpr;
        gy[i] = dy * 0.5 * dpr;
        gmax = Math.max(gmax, Math.abs(gx[i] ?? 0), Math.abs(gy[i] ?? 0));
      }
    }
    const packed = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      packed[i * 4] = Math.round(((gx[i] ?? 0) / gmax) * 127.5 + 127.5);
      packed[i * 4 + 1] = Math.round(((gy[i] ?? 0) / gmax) * 127.5 + 127.5);
      packed[i * 4 + 2] = Math.round((height[i] ?? 0) * 255);
      packed[i * 4 + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, packed);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    state.grad = gmax;
    state.rect = [left * dpr, canvas.height - (top * dpr + h), w, h];
  };

  const readColors = () => {
    const css = getComputedStyle(host);
    state.bg = parseColor(css.getPropertyValue("--bg"), state.bg);
    state.ink = parseColor(css.getPropertyValue("--ink"), state.ink);
  };

  const draw = () => {
    if (destroyed || gl.isContextLost()) return;
    const { bg, ink } = state;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(loc.dpr, state.dpr);
    gl.uniform4f(loc.rect, ...state.rect);
    gl.uniform1f(loc.grad, state.grad);
    gl.uniform3f(loc.light, ...state.light);
    gl.uniform1f(loc.rise, state.rise);
    gl.uniform3f(loc.bg, ...bg);
    gl.uniform3f(loc.ink, ...ink);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 1 / 60);
    lastFrame = now;
    if (state.aiming) {
      const k = 1 - Math.exp(-dt / state.lag);
      const next = state.light.map((v, i) => v + ((state.target[i] ?? v) - v) * k);
      const len = Math.hypot(...next) || 1;
      state.light = next.map((v) => v / len) as Rgb;
      const gap = Math.hypot(...state.light.map((v, i) => v - (state.target[i] ?? v)));
      if (gap < 2e-4) {
        state.light = [...state.target];
        state.aiming = false;
      }
    }
    draw();
    if (state.aiming) request();
    else lastFrame = 0;
  };

  function request() {
    if (raf || destroyed || !state.visible) return;
    raf = requestAnimationFrame(frame);
  }

  const aim = (target: LightAngles, lag: number) => {
    state.target = toVector(target);
    state.lag = lag;
    state.aiming = true;
    request();
  };

  const aimAtPointer = () => {
    const sig = art.getBoundingClientRect();
    const dx = pointer.x - (sig.left + sig.width / 2);
    const dy = sig.top + sig.height / 2 - pointer.y;
    const reach = Math.hypot(dx, dy) / Math.max(1, sig.width * 0.5);
    const el = EL_NEAR + (EL_FAR - EL_NEAR) * smoothstep(0, 1.15, reach);
    aim({ az: Math.atan2(dy, dx), el }, FOLLOW_LAG);
  };

  const rest = () => aim(REST_LIGHT, REST_LAG);

  const onMove = (e: PointerEvent) => {
    pointer.inside = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!state.interactive) return;
    aimAtPointer();
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(rest, IDLE_AFTER);
  };
  const onLeave = () => {
    pointer.inside = false;
    window.clearTimeout(idleTimer);
    if (state.interactive) rest();
  };

  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerdown", onMove);
  host.addEventListener("pointerleave", onLeave);

  const io = new IntersectionObserver((entries) => {
    state.visible = entries.some((entry) => entry.isIntersecting);
    if (state.visible) request();
  });
  io.observe(host);

  // Rebuilding the height map blurs a large buffer: wait for the size to settle.
  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      readColors();
      buildMap();
      draw();
    }, 120);
  });
  ro.observe(host);

  readColors();
  buildMap();
  draw();

  const relief: Relief = {
    setRise(rise) {
      state.rise = rise;
      request();
    },
    setLight(light) {
      state.light = toVector(light);
      state.target = [...state.light];
      state.aiming = false;
      request();
    },
    setInteractive(on) {
      state.interactive = on;
      window.clearTimeout(idleTimer);
      if (on && pointer.inside) aimAtPointer();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(idleTimer);
      window.clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
  return relief;
}
