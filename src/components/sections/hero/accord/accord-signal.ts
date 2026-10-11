/*
  The Accord signal: two strings stretched across the band, fixed at both edges like the two sides of
  a table. One fragment shader draws both with a hot core and a soft halo. Detuned, they run at
  different frequencies and phases, with noise and phosphor trails; tuned, they coincide; at rest the
  single string is flat ("le fil"), and on scroll its centre drops into the page's vertical thread.

  Coordinates: x 0–1 across the canvas, y 0–1 up (GL), distances in canvas-height units.
*/

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uPx;       // one CSS px in height units
uniform float uTime;
uniform float uDetune;   // 1 = out of tune, 0 = in tune
uniform float uMain;     // amplitude of the shared tone (0 = the string at rest)
uniform vec2  uIntro;    // how far A (from the left) and B (from the right) have come in, 0–1
uniform float uPulse;    // light running out from the centre after the lock, 0–1 (0 = none)
uniform float uDrop;     // 0–1: the line retracts to the centre and drops down the page
uniform vec2  uPhase;
uniform vec2  uK;
uniform vec3  uPointer;  // x, y, on
uniform float uLineY;
uniform float uAmp;
uniform vec3  uBg;
uniform vec3  uColA;
uniform vec3  uColB;
uniform vec3  uHot;

const float PI = 3.14159265;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float vnoise(float x) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)) * 2.0 - 1.0;
}

// Displacement of one string at x, in height units. s = 0 for A, 1 for B; lag trails it in time.
float strand(float x, float k, float ph, float s, float lag) {
  float d = uDetune;
  float env = pow(sin(PI * clamp(x, 0.0, 1.0)), 0.6);
  float y = sin(x * k - ph + lag) * mix(0.42, 0.8, d) * uMain;
  y += d * 0.34 * sin(x * k * 2.37 + uTime * (1.7 + s) + s * 4.1 + lag * 2.0);
  y += d * 0.3 * vnoise(x * 26.0 + uTime * (2.3 + s * 0.8) + s * 17.0 + lag * 3.0);
  return y * env * uAmp;
}

// Hot core plus a glow that dies out within ~120px, so nothing is cut at the band's edge.
float light(float dist) {
  float core = 1.0 - smoothstep(uPx * 0.3, uPx * 1.3, dist);
  return core + exp(-dist / (uPx * 6.0)) * 0.35 + exp(-dist / (uPx * 26.0)) * 0.1;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = gl_FragCoord.xy / uRes;
  float x = uv.x;
  float dy = uv.y - uLineY;
  vec3 col = uBg;

  // Graticule: a dashed axis and two rows of ticks, like an instrument.
  float dash = step(0.55, fract(gl_FragCoord.x / (uPx * uRes.y * 9.0)));
  col += uColB * (1.0 - smoothstep(0.0, uPx, abs(dy))) * dash * 0.07 * (1.0 - uDrop);
  float row = 1.0 - step(uPx * 5.0, abs(abs(dy) - uAmp * 1.32));
  float tx = abs(fract(x * 48.0 + 0.5) - 0.5) / 48.0 * aspect;
  col += uColB * row * (1.0 - smoothstep(0.0, uPx * 0.9, tx)) * 0.16;

  float reach = 1.0 - uDrop;
  float span = 1.0 - smoothstep(reach - 0.015, reach, abs(x - 0.5) * 2.0);

  float reachY = uAmp * 1.6 + uPx * 120.0;
  if (abs(dy) < reachY) {
    // Fade the strings' light to nothing before the edge of the band, so no box ever shows.
    float window = 1.0 - smoothstep(reachY * 0.6, reachY, abs(dy));
    float e = 1.5 * uPx / aspect;
    float bend = uPointer.z * exp(-pow((x - uPointer.x) * aspect / 0.1, 2.0))
      * clamp(uPointer.y - uLineY, -uAmp, uAmp) * 0.55;

    float yA = strand(x, uK.x, uPhase.x, 0.0, 0.0) + bend;
    float sA = (strand(x + e, uK.x, uPhase.x, 0.0, 0.0) - strand(x - e, uK.x, uPhase.x, 0.0, 0.0)) / (2.0 * e * aspect);
    float nA = 1.0 / sqrt(1.0 + sA * sA);
    float yB = strand(x, uK.y, uPhase.y, 1.0, 0.0) + bend;
    float sB = (strand(x + e, uK.y, uPhase.y, 1.0, 0.0) - strand(x - e, uK.y, uPhase.y, 1.0, 0.0)) / (2.0 * e * aspect);
    float nB = 1.0 / sqrt(1.0 + sB * sB);

    float visA = (1.0 - smoothstep(uIntro.x - 0.002, uIntro.x, x)) * span;
    float visB = smoothstep(1.0 - uIntro.y, 1.0 - uIntro.y + 0.002, x) * span;

    float lA = light(abs(dy - yA) * nA);
    float lB = light(abs(dy - yB) * nB);

    // Phosphor trails while out of tune.
    if (uDetune > 0.02) {
      for (int g = 1; g <= 2; g++) {
        float lag = float(g) * 0.45 * uDetune;
        float fade = pow(0.4, float(g)) * uDetune;
        lA += light(abs(dy - strand(x, uK.x, uPhase.x, 0.0, lag) - bend) * nA) * fade;
        lB += light(abs(dy - strand(x, uK.y, uPhase.y, 1.0, -lag) - bend) * nB) * fade;
      }
    }

    // The leading tips glow while each string comes in from its edge.
    float tipA = exp(-pow((x - uIntro.x) * aspect / 0.012, 2.0)) * step(uIntro.x, 0.999);
    float tipB = exp(-pow((x - (1.0 - uIntro.y)) * aspect / 0.012, 2.0)) * step(uIntro.y, 0.999);

    float merge = mix(0.62, 1.0, uDetune) * window;
    col += uColA * lA * visA * merge + uColB * lB * visB * merge;
    col += uHot * (tipA * light(abs(dy - yA) * nA) + tipB * light(abs(dy - yB) * nB)) * 1.6;

    if (uPulse > 0.0) {
      float r = abs(x - 0.5) * aspect;
      float front = uPulse * aspect * 0.55;
      float packet = exp(-pow((r - front) / 0.035, 2.0)) * (1.0 - uPulse);
      col += uHot * packet * lA * visA * 2.2;
    }
  }

  // The thread dropping from the meeting point to the bottom of the band.
  if (uDrop > 0.0) {
    float sx = abs(x - 0.5) * aspect;
    float bottom = uLineY * (1.0 - uDrop);
    float sy = uv.y > uLineY ? uv.y - uLineY : (uv.y < bottom ? bottom - uv.y : 0.0);
    col += uHot * light(length(vec2(sx, sy))) * 0.9;
  }

  col += (hash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) - 0.5) * 0.02;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export type SignalUniforms = {
  time: number;
  detune: number;
  main: number;
  introA: number;
  introB: number;
  pulse: number;
  drop: number;
  phaseA: number;
  phaseB: number;
  kA: number;
  kB: number;
  /** 0–1 from the top-left, like CSS. */
  pointer: { x: number; y: number; on: number };
  /** Centre of the band and its half height, 0–1 of the canvas height, from the top. */
  lineY: number;
  amp: number;
};

export type SignalColors = { bg: string; a: string; b: string; hot: string };

const MAX_DPR = 1.5;

function rgb(hex: string): [number, number, number] {
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
  const v = parseInt(full, 16);
  if (Number.isNaN(v)) return [0, 0, 0];
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Accord shader:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Returns null when WebGL is unavailable; the band then stays plain and the headline still reads. */
export function createSignal(canvas: HTMLCanvasElement, colors: SignalColors) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false });
  if (!gl || gl.isContextLost()) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Accord link:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const loc = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: loc("uRes"),
    px: loc("uPx"),
    time: loc("uTime"),
    detune: loc("uDetune"),
    main: loc("uMain"),
    intro: loc("uIntro"),
    pulse: loc("uPulse"),
    drop: loc("uDrop"),
    phase: loc("uPhase"),
    k: loc("uK"),
    pointer: loc("uPointer"),
    lineY: loc("uLineY"),
    amp: loc("uAmp"),
    bg: loc("uBg"),
    a: loc("uColA"),
    b: loc("uColB"),
    hot: loc("uHot"),
  };
  gl.uniform3fv(u.bg, rgb(colors.bg));
  gl.uniform3fv(u.a, rgb(colors.a));
  gl.uniform3fv(u.b, rgb(colors.b));
  gl.uniform3fv(u.hot, rgb(colors.hot));

  return {
    render(s: SignalUniforms) {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.px, dpr / h);
      gl.uniform1f(u.time, s.time % 3600);
      gl.uniform1f(u.detune, s.detune);
      gl.uniform1f(u.main, s.main);
      gl.uniform2f(u.intro, s.introA, s.introB);
      gl.uniform1f(u.pulse, s.pulse);
      gl.uniform1f(u.drop, s.drop);
      gl.uniform2f(u.phase, s.phaseA, s.phaseB);
      gl.uniform2f(u.k, s.kA, s.kB);
      gl.uniform3f(u.pointer, s.pointer.x, 1 - s.pointer.y, s.pointer.on);
      gl.uniform1f(u.lineY, 1 - s.lineY);
      gl.uniform1f(u.amp, s.amp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

export type Signal = NonNullable<ReturnType<typeof createSignal>>;
