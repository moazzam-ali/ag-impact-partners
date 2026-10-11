"use client";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/motion/gsap";

import styles from "./curtain.module.css";
import { rest, stillSwap } from "./run";
import { played } from "./styles";

/*
  The page change in Proxy Papers' feel (its PageTransitionProvider): a sheet sweeps over the page,
  its leading edge bowing out as it travels and flattening as it lands (power2.inOut, the bow a
  sine yoyo), covers it, and sweeps on off the far side the same way. The mark rises in over the
  last half second of the cover and drifts up and away as the reveal starts (`markBeat`).

  Several layers (a style's palette, bottom first) can follow each other by a beat (`lag`) or by a
  fixed distance (`gap`, in percent of the screen). Drawn as full-screen SVG paths in a 100 x 100
  box stretched to the viewport, rewritten every frame.
*/
type Axis = "y" | "x";

/** The covering part of the screen for an edge at `e` (0-100) bowed by `b`. */
function shape(mode: "cover" | "reveal", axis: Axis, e: number, b: number) {
  const c = e - 2 * b;
  if (axis === "y") {
    return mode === "cover"
      ? `M0 100 L0 ${e} Q50 ${c} 100 ${e} L100 100 Z`
      : `M0 0 L100 0 L100 ${e} Q50 ${c} 0 ${e} Z`;
  }
  return mode === "cover"
    ? `M100 0 L${e} 0 Q${c} 50 ${e} 100 L100 100 Z`
    : `M0 0 L${e} 0 Q${c} 50 ${e} 100 L0 100 Z`;
}
const line = (axis: Axis, e: number, b: number) =>
  axis === "y" ? `M0 ${e} Q50 ${e - 2 * b} 100 ${e}` : `M${e} 0 Q${e - 2 * b} 50 ${e} 100`;

/**
 * Proxy Papers' mark beat on a page change: the mark rises in over the last half second of the
 * cover and drifts up and fades as the reveal starts. Call after the timeline's "covered" label.
 */
export function markBeat(
  tl: gsap.core.Timeline,
  mark: Element | null | undefined,
  coverEnd: number,
) {
  if (!mark) return tl;
  gsap.set(mark, { autoAlpha: 0, yPercent: 18 });
  return tl
    .to(mark, { autoAlpha: 1, yPercent: 0, duration: 0.5, ease: "power3.out" }, coverEnd - 0.5)
    .to(mark, { autoAlpha: 0, yPercent: -22, duration: 0.5, ease: "power2.in" }, "covered");
}

/**
 * The sheet's layers, one class each (bottom first), an optional hairline on the top edge, and the
 * mark at the centre (`mark` colours it for the top layer).
 */
export function BendLayers({
  layers,
  edge,
  mark,
}: {
  layers: string[];
  edge?: string;
  mark?: string;
}) {
  return (
    <>
      <svg
        className={styles.bend}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-bend
      >
        {layers.map((layer, i) => (
          <path key={i} className={layer} data-bend-layer d="" />
        ))}
        {edge ? <path className={edge} data-bend-edge d="" /> : null}
      </svg>
      <div className={styles.bendMarkWrap}>
        <LogoLockup part="mark" className={cn(styles.bendMark, mark)} data-bend-mark />
      </div>
    </>
  );
}

type Options = { axis?: Axis; lag?: number; gap?: number; bend?: number };

/** Runs the swap on a style's root: cover, change page at the covered moment, reveal. */
export async function bendSwap(
  root: HTMLElement,
  go: () => Promise<void>,
  onReveal: () => void,
  { axis = "y", lag = 0, gap = 0, bend = 16 }: Options = {},
  reduced = false,
) {
  const layers = [...root.querySelectorAll<SVGPathElement>("[data-bend-layer]")];
  const edgeLine = root.querySelector<SVGPathElement>("[data-bend-edge]");
  const mark = root.querySelector("[data-bend-mark]");
  const n = layers.length;
  // Layer i's edge leads the top layer by `gap` going in and trails it going out.
  const lead = (i: number) => (n - 1 - i) * gap;
  const state = layers.map(() => ({ e: 100, b: 0 }));
  let mode: "cover" | "reveal" = "cover";
  const draw = () => {
    layers.forEach((path, i) => {
      const s = state[i]!;
      const e = mode === "cover" ? s.e - lead(i) : s.e + lead(i);
      path.setAttribute("d", shape(mode, axis, e, s.b));
    });
    const top = state[n - 1];
    if (edgeLine && top) {
      const visible = top.e > 0.2 && top.e < 99.8;
      edgeLine.setAttribute("d", visible ? line(axis, top.e, top.b) : "");
    }
  };
  const clear = () => {
    layers.forEach((path) => path.setAttribute("d", ""));
    edgeLine?.setAttribute("d", "");
  };

  if (reduced) {
    mode = "reveal";
    state.forEach((s) => Object.assign(s, { e: 100, b: 0 }));
    draw();
    if (mark) gsap.set(mark, { autoAlpha: 1, yPercent: 0 });
    await stillSwap(root, go, onReveal);
    if (mark) gsap.set(mark, { autoAlpha: 0 });
    clear();
    return;
  }

  root.dataset.state = "busy";
  draw();
  const top = [...state].reverse();
  const tl = gsap
    .timeline({ onUpdate: draw })
    .to(state, { e: 0, duration: 0.72, ease: "power2.inOut", stagger: lag }, 0)
    .to(
      state,
      { b: bend, duration: 0.36, ease: "sine.inOut", yoyo: true, repeat: 1, stagger: lag },
      0,
    )
    .addLabel("covered")
    .call(() => {
      mode = "reveal";
      state.forEach((s) => Object.assign(s, { e: 100, b: 0 }));
      draw();
    })
    .to(top, { e: 0, duration: 0.82, ease: "power2.inOut", stagger: lag }, "covered")
    .to(
      top,
      { b: bend, duration: 0.41, ease: "sine.inOut", yoyo: true, repeat: 1, stagger: lag },
      "covered",
    );
  markBeat(tl, mark, 0.72 + lag * (n - 1));
  tl.addPause("covered", () => {
    void go().then(() => {
      onReveal();
      tl.resume();
    });
  });
  await played(tl);
  clear();
  rest(root);
}
