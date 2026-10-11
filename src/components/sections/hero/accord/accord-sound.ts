/*
  Optional sound for Accord, off by default and only ever started by the visitor's click. Two soft
  tones a fifth apart (G3 and D4); out of tune they beat against each other, in tune they settle
  into the fifth, and the lock adds a quiet octave that blooms and fades.
*/
const ROOT = 196;
const FIFTH = 293.66;
const LEVEL = 0.06;

export class AccordSound {
  private ctx: AudioContext;
  private master: GainNode;
  private a: OscillatorNode;
  private b: OscillatorNode;

  constructor() {
    this.ctx = new AudioContext();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1600;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    filter.connect(this.master).connect(this.ctx.destination);

    const voice = (freq: number, level: number) => {
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = this.ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(filter);
      osc.start();
      return osc;
    };
    this.a = voice(ROOT, 0.6);
    this.b = voice(FIFTH, 0.45);
  }

  /** Detune 1 = far apart, 0 = a pure fifth. */
  update(detune: number) {
    const now = this.ctx.currentTime;
    this.a.frequency.setTargetAtTime(ROOT * (1 + 0.045 * detune), now, 0.06);
    this.b.frequency.setTargetAtTime(FIFTH * (1 - 0.06 * detune), now, 0.06);
  }

  on() {
    void this.ctx.resume();
    this.master.gain.setTargetAtTime(LEVEL, this.ctx.currentTime, 0.25);
  }

  off() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
  }

  /** The lock: an octave above the root blooms and fades. */
  resolve() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = ROOT * 2;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 3.1);
  }

  dispose() {
    void this.ctx.close();
  }
}
