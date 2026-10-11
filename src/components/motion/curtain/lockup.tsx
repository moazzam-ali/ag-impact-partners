"use client";

import { useId } from "react";

import {
  LOGO_VIEWBOX,
  MARK_PARTS,
  WORD_IMPACT,
  WORD_PARTNERS,
} from "@/components/brand/logo-parts";
import { cn } from "@/lib/cn";
import { type Loader } from "@/lib/motion/curtain";
import { gsap } from "@/lib/motion/gsap";

import styles from "./curtain.module.css";

/*
  The splash lockup shared by esquisse, iris and biais, and how it is built: the mark is traced
  shape by shape as the page loads (an accent hairline), each shape filling as its outline closes
  and the hairline fading into the fill; the wordmark rises line by line out of a mask once the A
  is done. Under it a hairline loader: a fill, a dot at its head, a count (and a caption).

  Strokes are in logo units (DrawSVG needs strokes that scale), sized for the lockup's width.
*/

/** Lines of the wordmark: each clipped to its own band, so letters rise out of nothing. */
const LINES = [
  { letters: WORD_IMPACT, band: { y: 150, h: 440 }, drop: 440 },
  { letters: WORD_PARTNERS, band: { y: 540, h: 360 }, drop: 380 },
] as const;

export function CurtainLockup({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={cn(styles.traced, className)}
      data-lockup
      aria-hidden="true"
    >
      <defs>
        {LINES.map((line, l) => (
          <clipPath key={l} id={`${id}-line-${l}`} clipPathUnits="userSpaceOnUse">
            <rect x="1380" y={line.band.y} width="1800" height={line.band.h} />
          </clipPath>
        ))}
      </defs>
      <g className={styles.lockupMark}>
        {MARK_PARTS.map((shape, i) => (
          <path key={i} d={shape.d} data-shape={i} />
        ))}
      </g>
      {LINES.map((line, l) => (
        <g key={l} clipPath={`url(#${id}-line-${l})`}>
          {line.letters.map((letter, i) => (
            <path key={i} d={letter.d} data-letter={l} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** The hairline loader under the lockup, as wide as it: fill, head dot, count, optional caption. */
export function Hairline({ caption }: { caption?: string }) {
  return (
    <span className={styles.hair} data-hair>
      <span className={styles.hairTrack} data-hair-track>
        <span className={styles.hairFill} data-hair-fill />
      </span>
      <span className={styles.hairDot} data-hair-dot />
      <span className={styles.hairMeta}>
        <span>{caption}</span>
        <span className={styles.hairCount} data-count>
          000
        </span>
      </span>
    </span>
  );
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function lockupParts(root: Element) {
  const q = gsap.utils.selector(root);
  return {
    svg: q<SVGSVGElement>("[data-lockup]")[0]!,
    shapes: q("[data-lockup] [data-shape]"),
    lines: LINES.map((_, l) => q(`[data-lockup] [data-letter='${l}']`)),
    hair: q("[data-hair]"),
    track: q("[data-hair-track]"),
    fill: q("[data-hair-fill]"),
    dot: q("[data-hair-dot]"),
    count: q<HTMLElement>("[data-count]")[0],
  };
}
type Lockup = ReturnType<typeof lockupParts>;

/** Everything hidden, ready to build. */
export function prepareLockup(p: Lockup) {
  gsap.set(p.svg, { visibility: "visible" });
  gsap.set(p.shapes, { drawSVG: "0% 0%", fillOpacity: 0, strokeOpacity: 1 });
  p.lines.forEach((letters, l) => gsap.set(letters, { y: LINES[l]!.drop }));
  gsap.set(p.fill, { scaleX: 0 });
  gsap.set(p.dot, { x: 0, autoAlpha: 0 });
}

/** The finished lockup, for reduced motion. */
export function settleLockup(p: Lockup) {
  gsap.set(p.svg, { visibility: "visible" });
  gsap.set(p.shapes, { drawSVG: "0% 100%", fillOpacity: 1, strokeOpacity: 0 });
  p.lines.forEach((letters) => gsap.set(letters, { y: 0 }));
  gsap.set(p.hair, { autoAlpha: 1 });
}

export const wordsIn = (p: Lockup) =>
  gsap
    .timeline()
    .to(p.lines[0]!, { y: 0, duration: 0.6, ease: "power3.out", stagger: 0.025 })
    .to(p.lines[1]!, { y: 0, duration: 0.6, ease: "power3.out", stagger: 0.025 }, 0.15);

export const wordsOut = (p: Lockup) =>
  gsap
    .timeline()
    .to(p.lines[1]!, { y: LINES[1].drop, duration: 0.35, ease: "power2.in", stagger: 0.01 })
    .to(p.lines[0]!, { y: LINES[0].drop, duration: 0.35, ease: "power2.in", stagger: 0.01 }, 0.05);

/**
 * The loader's readout for the lockup: traces the mark (one shape after another, each filling as it
 * closes), moves the hairline, its dot and the count, and starts the wordmark once the A is done.
 * `show` takes the progress, `run` follows a loader at a readable pace; `words` resolves when the
 * wordmark has risen.
 */
export function lockupReadout(p: Lockup) {
  const filled = p.shapes.map(() => false);
  const width = (p.track[0] as HTMLElement | undefined)?.offsetWidth ?? 0;
  let resolveWords = () => {};
  const words = new Promise<void>((resolve) => {
    resolveWords = resolve;
  });
  let rising = false;
  const rise = () => {
    if (rising) return;
    rising = true;
    wordsIn(p).eventCallback("onComplete", resolveWords);
  };
  const show = (v: number) => {
    p.shapes.forEach((shape, i) => {
      const local = clamp01(v * 3.2 - i * 1.05);
      gsap.set(shape, { drawSVG: `0% ${local * 100}%` });
      if (local >= 1 && !filled[i]) {
        filled[i] = true;
        // The shape fills and settles with a small elastic pop (Proxy Papers' icon burst).
        gsap.to(shape, { fillOpacity: 1, strokeOpacity: 0, duration: 0.6, ease: "power2.out" });
        gsap.fromTo(
          shape,
          { scale: 0.92, transformOrigin: "50% 50%" },
          { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" },
        );
      }
    });
    gsap.set(p.fill, { scaleX: v });
    gsap.set(p.dot, { x: v * width, autoAlpha: v > 0.01 && v < 0.999 ? 1 : 0 });
    if (p.count) p.count.textContent = String(Math.round(v * 100)).padStart(3, "0");
    if (v > 0.32) rise();
  };
  /**
   * Follows the loader, but never faster than one full trace in `minimum` seconds, so the build is
   * always drawn even when the page is already in. Resolves when the trace is complete.
   */
  const run = (loader: Loader, minimum = 1.1) =>
    new Promise<void>((resolve) => {
      let shown = 0;
      const tick = (_time: number, deltaMs: number) => {
        shown = Math.min(loader.progress.value, shown + deltaMs / 1000 / minimum);
        show(shown);
        if (shown < 1) return;
        gsap.ticker.remove(tick);
        resolve();
      };
      gsap.ticker.add(tick);
    });
  return { show, words, rise, run };
}
