"use client";

import { gsap } from "@/lib/motion/gsap";
import { type Loader } from "@/lib/motion/curtain";

/*
  Shared steps for the curtain: waiting, the loader's readout, the swap's covered moment, the mark
  beat, the mark-shaped window, and the reduced-motion path (no movement: the lockup stands still
  while the page loads, then the curtain fades).
*/

/** What the curtain does; MotionShell runs it. `onReveal` fires as the page starts to show. */
export type CurtainHandle = {
  splash(loader: Loader, onReveal: () => void): Promise<void>;
  /** A page change: cover, change page at the covered moment (`go`), reveal; no rest between. */
  swap(go: () => Promise<void>, onReveal: () => void): Promise<void>;
};

/** Resolves when a timeline completes. */
export const played = (tl: gsap.core.Animation) =>
  new Promise<void>((resolve) => {
    tl.eventCallback("onComplete", () => resolve());
  });

export const wait = (seconds: number) => new Promise<void>((r) => setTimeout(r, seconds * 1000));

/** Calls `show(value)` on every frame until the loader is done, then once more at 1. */
export async function readout(loader: Loader, show: (value: number) => void) {
  const tick = () => show(loader.progress.value);
  gsap.ticker.add(tick);
  await loader.done;
  gsap.ticker.remove(tick);
  show(1);
}

/** The reduced-motion splash: the lockup stands still, the count still runs (`show`), then a fade. */
export async function stillSplash(
  el: HTMLElement,
  loader: Loader,
  onReveal: () => void,
  show?: (value: number) => void,
) {
  await (show ? readout(loader, show) : loader.done);
  onReveal();
  await played(gsap.to(el, { autoAlpha: 0, duration: 0.4, ease: "power1.out" }));
  rest(el);
}

/**
 * A page swap in one movement: the timeline plays to its "covered" label, the route changes there
 * (`go`, which resolves once the new page has rendered), and it plays straight on. It only holds at
 * the label if the next page is not ready yet.
 */
export function swapThrough(tl: gsap.core.Timeline, go: () => Promise<void>, onReveal: () => void) {
  tl.addPause("covered", () => {
    void go().then(() => {
      onReveal();
      tl.resume();
    });
  });
  return played(tl);
}

/** The reduced-motion swap: fade the (already covering) curtain in, change page, fade out. */
export async function stillSwap(el: HTMLElement, go: () => Promise<void>, onReveal: () => void) {
  el.dataset.state = "busy";
  await played(gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }));
  await go();
  onReveal();
  await played(gsap.to(el, { autoAlpha: 0, duration: 0.25, ease: "power1.out" }));
  rest(el);
}

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

/** The middle of the mark, and the whole logo's box, in logo units. */
const MARK_CENTRE = { x: 667, y: 525 };
const LOGO = { x: 59, y: 78, w: 3082 };

/**
 * Lays a viewport-sized SVG (its viewBox the viewport) exactly over a logo already on screen
 * (`logo` is the rendered lockup SVG, viewBox LOGO), so a mark-shaped window can take the mark's
 * place. `place` puts logo units on it; `zoom(v)` is a transform for the window: 0 is the mark
 * itself; towards 1 it grows into `into` (a point inside the A's left leg, logo units) while that
 * point moves to the centre, until the shape covers the screen; towards -1 it shrinks to nothing
 * about the mark's centre.
 */
export function markStageOver(
  svg: SVGSVGElement,
  logo: SVGSVGElement,
  into = { x: 262, y: 640 },
  far = 110,
) {
  const r = logo.getBoundingClientRect();
  const k = r.width / LOGO.w;
  const tx = r.left - LOGO.x * k;
  const ty = r.top - LOGO.y * k;
  const w = svg.clientWidth || window.innerWidth;
  const h = svg.clientHeight || window.innerHeight;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  const point = { x: tx + into.x * k, y: ty + into.y * k };
  const centre = { x: tx + MARK_CENTRE.x * k, y: ty + MARK_CENTRE.y * k };
  return {
    place: `translate(${tx} ${ty}) scale(${k})`,
    centre,
    zoom(v: number) {
      if (v >= 0) {
        const s = Math.exp(v * Math.log(far));
        const ax = point.x + (w / 2 - point.x) * v;
        const ay = point.y + (h / 2 - point.y) * v;
        return `translate(${ax} ${ay}) scale(${s}) translate(${-point.x} ${-point.y})`;
      }
      const s = Math.max(0.0001, 1 + v);
      return `translate(${centre.x} ${centre.y}) scale(${s}) translate(${-centre.x} ${-centre.y})`;
    },
  };
}

/** Hides the curtain until the next cover. */
export function rest(el: HTMLElement) {
  el.dataset.state = "idle";
  gsap.set(el, { clearProps: "opacity,visibility" });
}
