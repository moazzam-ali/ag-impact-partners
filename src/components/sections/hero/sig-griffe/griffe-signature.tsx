"use client";

import { useRef, type CSSProperties } from "react";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { SIGNATURE_INTRO } from "../signature-shell";

import { SIGNATURE_BOX, SIGNATURE_DOT, SIGNATURE_STROKES } from "./griffe-geometry";
import { buildPen, drawPen } from "./griffe-pen";
import styles from "./griffe-signature.module.css";

/** Centre of the 1512 x 982 artboard the geometry was composed on. */
const ARTBOARD_CENTRE = { x: 756, y: 491 };
const MAX_DPR = 2;
/**
 * The load-time gesture: the first stroke of the peak A, drawn while the headline rises, then the
 * pen rests at its foot until the visitor scrolls.
 */
const INTRO = { delay: SIGNATURE_INTRO.signature, duration: 0.85 };
/** How long the hero stays pinned while the visitor signs, in viewport heights of scroll. */
const PIN_LENGTH = 1.35;
/** A little lag behind the wheel, so the ink seems to flow. */
const SCRUB = 0.6;
/** Scrub timeline (0..1): the pen writes until SIGNED, then the full stop lands. */
const SIGNED = 0.86;
/** Below this scrub progress the visitor has not scrolled yet (ScrollTrigger reports ~1e-6 at rest). */
const AT_REST = 0.001;
/** The thread grows at scroll speed (its tip stays put on screen) for at most this many viewports. */
const THREAD_MAX = 0.85;

const pen = buildPen(SIGNATURE_STROKES);

const boxStyle = {
  "--box-x": SIGNATURE_BOX.x - ARTBOARD_CENTRE.x,
  "--box-y": SIGNATURE_BOX.y - ARTBOARD_CENTRE.y,
  "--box-w": SIGNATURE_BOX.width,
  "--box-h": SIGNATURE_BOX.height,
} as CSSProperties;

const dotStyle = {
  "--dot-x": `${(SIGNATURE_DOT.x / SIGNATURE_BOX.width) * 100}%`,
  "--dot-y": `${(SIGNATURE_DOT.y / SIGNATURE_BOX.height) * 100}%`,
} as CSSProperties;

/*
  The "griffe": AG Impact signed like a contract. On load the pen writes the peak of the A and rests
  at its foot; then the hero pins and the scroll drives the pen through G, Impact and the paraphe,
  at an even speed per unit of scroll (scrolling back un-signs). The full stop lands, headline line 2
  rises, and as the pin releases the paraphe's tail runs on as one thin accent thread out of the hero.
*/
export function GriffeSignature() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const section = el?.closest("section");
      const canvas = el?.querySelector("canvas");
      const ctx = canvas?.getContext("2d");
      const dot = el?.querySelector<HTMLElement>("[data-dot]");
      if (!el || !section || !canvas || !ctx || !dot) return;

      // Pen time shown on the canvas: the intro until the visitor scrolls, then the scrub.
      const state = { intro: 0, scroll: 0 };
      const penTime = () =>
        state.scroll > AT_REST ? pen.rest + state.scroll * (pen.total - pen.rest) : state.intro;

      // Paint only when the pen moves (tween updates already run on GSAP's rAF ticker).
      let drawn = -1;
      let ink = "";
      const paint = (force = false) => {
        const t = penTime();
        if (!force && t === drawn) return;
        drawn = t;
        const k = canvas.width / SIGNATURE_BOX.width;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(k, 0, 0, k, 0, 0);
        ctx.strokeStyle = ink;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        drawPen(ctx, pen, t);
      };
      const update = () => paint();

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
        ink = getComputedStyle(el).getPropertyValue("--ink").trim();
        paint(true);
      };
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        state.scroll = 1;
        paint(true);
        // Already signed: the invitation to sign would be false here.
        const hint = section.querySelector("[data-hint]");
        if (hint) gsap.set(hint, { filter: "opacity(0)" });
        return () => {
          state.scroll = 0;
        };
      });

      mm.add(MOTION_OK, () => {
        gsap.set(dot, { scale: 0 });

        const intro = gsap.to(state, {
          intro: pen.rest,
          duration: INTRO.duration,
          delay: INTRO.delay,
          ease: EASE.linear,
          onUpdate: update,
        });

        const tl = gsap.timeline({
          defaults: { ease: EASE.linear },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * PIN_LENGTH}`,
            pin: section,
            scrub: SCRUB,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (self.progress > AT_REST && intro.progress() < 1) intro.progress(1);
            },
          },
        });
        // The hint has done its job once the pen moves (filter, so the shell's own fade stays intact).
        const hint = section.querySelector("[data-hint]");
        if (hint)
          tl.fromTo(hint, { filter: "opacity(1)" }, { filter: "opacity(0)", duration: 0.06 }, 0);
        tl.to(state, { scroll: 1, duration: SIGNED, onUpdate: update }, 0)
          .to(dot, { scale: 1, duration: 0.05, ease: EASE.pop }, SIGNED)
          // Hold the signed state for the rest of the pin.
          .to({}, { duration: 1 - SIGNED - 0.05 });

        // Le fil: born at the full stop, it keeps the pen's place on screen while the page moves on.
        const pin = tl.scrollTrigger;
        const thread = document.createElement("div");
        thread.className = styles.thread ?? "";
        thread.setAttribute("aria-hidden", "true");
        document.body.append(thread);
        const threadLength = () =>
          Math.max(
            120,
            Math.min(
              ScrollTrigger.maxScroll(window) - (pin?.end ?? 0),
              window.innerHeight * THREAD_MAX,
            ),
          );
        const placeThread = () => {
          const d = dot.getBoundingClientRect();
          const s = section.getBoundingClientRect();
          thread.style.left = `${d.left + d.width / 2 + window.scrollX}px`;
          thread.style.top = `${(pin?.end ?? 0) + d.top + d.height / 2 - s.top}px`;
          thread.style.height = `${threadLength()}px`;
        };
        gsap.fromTo(
          thread,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: EASE.linear,
            scrollTrigger: {
              start: () => pin?.end ?? 0,
              end: () => (pin?.end ?? 0) + threadLength(),
              scrub: SCRUB,
              invalidateOnRefresh: true,
              onRefresh: placeThread,
            },
          },
        );
        placeThread();

        return () => thread.remove();
      });

      return () => {
        mm.revert();
        observer.disconnect();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.root} style={boxStyle} aria-hidden="true">
      <canvas className={styles.canvas} />
      <span className={styles.dot} style={dotStyle} data-dot />
    </div>
  );
}
