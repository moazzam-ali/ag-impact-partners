/*
  The signature as a taut string. Each pen stroke is a 1D string along its arc length, pinned at
  both ends; u is the sideways displacement (along the stroke's normal) of each point:

    u_tt = c² u_ss − k u − γ u_t + ν v_ss

  c carries a disturbance along the letters, k springs every point back to rest, γ damps the whole
  string and ν (Kelvin–Voigt) damps short ripples first, so a pluck stays one clean, smooth wave.
  Integrated with symplectic Euler in sub-steps that respect the CFL limit.
*/

/** Wave speed along the stroke, in signature units per second. */
const SPEED = 280;
/** Spring back to rest (s⁻²). */
const SPRING = 9;
/** Damping (s⁻¹). */
const DAMPING = 1.6;
/** Damping of short ripples (units² s⁻¹). */
const RIPPLE_DAMPING = 20;
/** Largest displacement and velocity a point can take, in signature units (and per second). */
const MAX_U = 16;
const MAX_V = 2400;
const KNEE = MAX_U * 0.6;
/** Width (in points, sigma) over which a kick is spread along the string. */
const SPREAD = 9;
const KERNEL_NORM = 1 / (SPREAD * Math.sqrt(2 * Math.PI));
/** Envelope: angular rate that turns speed into amplitude (s⁻¹), and averaging half-width (points). */
const ENVELOPE_RATE = 9;
const ENVELOPE_SPAN = 12;
/** Below these everything counts as settled. */
const REST_U = 0.06;
const REST_V = 0.6;

export type PluckInput = {
  /** Pointer segment travelled since the last frame, in signature units. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Pointer velocity, in signature units per second (already capped). */
  vx: number;
  vy: number;
  /** Reach of the pointer, in signature units. */
  radius: number;
  /** How much of the pointer's speed becomes string speed. */
  gain: number;
};

export class StringWave {
  readonly u: Float32Array;
  private readonly v: Float32Array;
  private readonly a: Float32Array;
  private readonly kick: Float32Array;
  private readonly sums: Float32Array;
  private settled = true;

  constructor(
    private readonly count: number,
    private readonly spacing: number,
  ) {
    this.u = new Float32Array(count);
    this.v = new Float32Array(count);
    this.a = new Float32Array(count);
    this.kick = new Float32Array(count);
    this.sums = new Float32Array(count + 1);
  }

  get resting() {
    return this.settled;
  }

  /** Kick the points the pointer passed over, sideways, in the direction it was moving. */
  pluck(
    p: PluckInput,
    x: Float32Array,
    y: Float32Array,
    nx: Float32Array,
    ny: Float32Array,
  ): boolean {
    const { x0, y0, x1, y1, vx, vy, radius, gain } = p;
    const minX = Math.min(x0, x1) - radius - MAX_U;
    const maxX = Math.max(x0, x1) + radius + MAX_U;
    const minY = Math.min(y0, y1) - radius - MAX_U;
    const maxY = Math.max(y0, y1) + radius + MAX_U;
    const sx = x1 - x0;
    const sy = y1 - y0;
    const sl = sx * sx + sy * sy;
    const r2 = radius * radius;
    let hit = false;
    let first = this.count;
    let last = -1;
    const kick = this.kick;
    kick.fill(0);

    for (let i = 1; i < this.count - 1; i++) {
      const n1 = nx[i] ?? 0;
      const n2 = ny[i] ?? 0;
      const ui = this.u[i] ?? 0;
      const px = (x[i] ?? 0) + ui * n1;
      const py = (y[i] ?? 0) + ui * n2;
      if (px < minX || px > maxX || py < minY || py > maxY) continue;
      const t = sl > 0 ? Math.min(1, Math.max(0, ((px - x0) * sx + (py - y0) * sy) / sl)) : 0;
      const dx = px - (x0 + sx * t);
      const dy = py - (y0 + sy * t);
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const w = 1 - d2 / r2;
      kick[i] = (vx * n1 + vy * n2) * gain * w * w;
      first = Math.min(first, i);
      last = Math.max(last, i);
      hit = true;
    }
    if (!hit) return false;

    // Spread the kick along the string (gaussian) so a pluck is one smooth bump, never a kink.
    const from = Math.max(1, first - SPREAD * 3);
    const to = Math.min(this.count - 2, last + SPREAD * 3);
    for (let i = from; i <= to; i++) {
      let sum = 0;
      for (let j = Math.max(first, i - SPREAD * 3); j <= Math.min(last, i + SPREAD * 3); j++) {
        const d = (i - j) / SPREAD;
        sum += (kick[j] ?? 0) * Math.exp(-0.5 * d * d);
      }
      this.v[i] = clamp((this.v[i] ?? 0) + sum * KERNEL_NORM, MAX_V);
    }
    this.settled = false;
    return true;
  }

  /**
   * A smooth measure of how much each point is swinging (amplitude envelope, independent of the
   * wave's phase, averaged along the string), for colouring. Writes into `out`.
   */
  envelope(out: Float32Array) {
    const { u, v, count } = this;
    if (this.settled) {
      out.fill(0);
      return;
    }
    const { sums } = this;
    for (let i = 0; i < count; i++) {
      const ui = u[i] ?? 0;
      const vi = (v[i] ?? 0) / ENVELOPE_RATE;
      sums[i + 1] = (sums[i] ?? 0) + Math.sqrt(ui * ui + vi * vi);
    }
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - ENVELOPE_SPAN);
      const b = Math.min(count, i + ENVELOPE_SPAN + 1);
      out[i] = ((sums[b] ?? 0) - (sums[a] ?? 0)) / (b - a);
    }
  }

  /** Advance by dt seconds. Returns true while anything still moves. */
  step(dt: number): boolean {
    if (this.settled) return false;
    const h2 = this.spacing * this.spacing;
    const maxStep = (0.7 * this.spacing) / SPEED;
    const steps = Math.max(1, Math.ceil(dt / maxStep));
    const s = dt / steps;
    const { u, v, a, count } = this;
    const c2 = (SPEED * SPEED) / h2;
    const nu = RIPPLE_DAMPING / h2;

    for (let k = 0; k < steps; k++) {
      for (let i = 1; i < count - 1; i++) {
        const ui = u[i] ?? 0;
        const vi = v[i] ?? 0;
        const lap = (u[i - 1] ?? 0) - 2 * ui + (u[i + 1] ?? 0);
        const lapV = (v[i - 1] ?? 0) - 2 * vi + (v[i + 1] ?? 0);
        a[i] = c2 * lap - SPRING * ui - DAMPING * vi + nu * lapV;
      }
      for (let i = 1; i < count - 1; i++) {
        let vi = clamp((v[i] ?? 0) + (a[i] ?? 0) * s, MAX_V);
        let ui = (u[i] ?? 0) + vi * s;
        // Soft limit: past KNEE the string stiffens instead of hitting a wall.
        const over = Math.abs(ui) - KNEE;
        if (over > 0) {
          const room = MAX_U - KNEE;
          ui = Math.sign(ui) * (KNEE + room * Math.tanh(over / room));
          if (ui * vi > 0) vi *= 0.92;
        }
        v[i] = vi;
        u[i] = ui;
      }
    }

    let moving = false;
    for (let i = 0; i < count; i++) {
      if (Math.abs(u[i] ?? 0) > REST_U || Math.abs(v[i] ?? 0) > REST_V) {
        moving = true;
        break;
      }
    }
    if (!moving) {
      u.fill(0);
      v.fill(0);
      this.settled = true;
    }
    return moving;
  }
}

function clamp(value: number, limit: number) {
  return value > limit ? limit : value < -limit ? -limit : value;
}
