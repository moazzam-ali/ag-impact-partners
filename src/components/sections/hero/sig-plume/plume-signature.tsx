"use client";

import { useId, useLayoutEffect, useRef } from "react";

import { CustomEase, gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { createInkPad } from "./ink-pad";
import { PLUME_INK, PLUME_STROKES, PLUME_VIEWBOX } from "./plume-geometry";
import styles from "./plume-signature.module.css";
import { PEN_START } from "./plume-timing";

const GROUPS = PLUME_INK.map((_, group) =>
  PLUME_STROKES.map((stroke, index) => ({ stroke, index })).filter((s) => s.stroke.group === group),
);
const { x, y, w, h } = PLUME_VIEWBOX;
/** Time the nib takes to go back up a stroke it keeps contact with (m's stems, the c's ball). */
const RETRACE = 0.06;

/*
  The "plume" signature: "AG Impact" in pointed-pen copperplate, written in pen order. Each letter's
  ink is revealed through a mask drawn from its own pen routes (DrawSVG on round-capped strokes), so
  the thick and thin of the real letterforms appear exactly where the nib passes; an accent nib point
  leads the reveal and travels through the air on pen lifts. Then the visitor can sign too: press
  and drag anywhere on the hero to write with the same nib (see ink-pad.ts).
*/
export function PlumeSignature() {
  const root = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  // Centre the signature in the band the two headline lines leave free. The lines wrap differently
  // per locale and viewport (EN line 2 takes two lines), so the band is measured, not assumed.
  useLayoutEffect(() => {
    const el = root.current;
    const section = el?.closest("section");
    const first = section?.querySelector('[data-title="1"]');
    const second = section?.querySelector('[data-title="2"]');
    if (!el || !section || !first || !second) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const from = first.getBoundingClientRect().bottom - top;
      const to = second.getBoundingClientRect().top - top;
      el.style.setProperty("--band-middle", `${Math.round((from + to) / 2)}px`);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(first);
    ro.observe(second);
    measure();
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const routes = q<SVGPathElement>("[data-route]").sort(
        (a, b) => Number(a.dataset.route) - Number(b.dataset.route),
      );
      const [nib] = q<SVGGElement>("[data-nib]");
      const [canvas] = q<HTMLCanvasElement>("canvas");

      const mm = gsap.matchMedia();

      // Reduced motion: the finished signature at once (the routes are fully drawn by default) and
      // no nib. Signing still works: the visitor's own ink is not an animation of the page.
      mm.add(REDUCED_MOTION, () => {
        if (nib) gsap.set(nib, { autoAlpha: 0 });
        return canvas ? createInkPad(el, canvas) : undefined;
      });

      mm.add(MOTION_OK, () => {
        if (!nib) return;
        gsap.set(routes, { drawSVG: "0% 0%" });
        gsap.set(nib, { autoAlpha: 0 });

        const pen = { x: 0, y: 0 };
        const place = () => nib.setAttribute("transform", `translate(${pen.x} ${pen.y})`);
        const tl = gsap.timeline({ delay: PEN_START });
        let end: DOMPoint | null = null;

        PLUME_STROKES.forEach((stroke, i) => {
          const route = routes[i];
          if (!route) return;
          const length = route.getTotalLength();
          const start = route.getPointAtLength(0);
          const gap = end ? Math.hypot(start.x - end.x, start.y - end.y) : 0;
          end = route.getPointAtLength(length);

          if (i === 0) {
            tl.call(() => {
              pen.x = start.x;
              pen.y = start.y;
              place();
            }).to(nib, { autoAlpha: 1, duration: 0.2, ease: EASE.soft }, 0);
          } else if (stroke.lift > 0) {
            // Pen lift: the nib leaves the paper and travels to the next stroke.
            tl.to(pen, {
              x: start.x,
              y: start.y,
              duration: stroke.lift,
              ease: EASE.inOut,
              onUpdate: place,
            }).to(nib, { opacity: 0.45, duration: stroke.lift / 2, yoyo: true, repeat: 1 }, "<");
          } else if (gap > 4) {
            // The pen keeps contact but goes back up a stroke it has just written (a retrace).
            tl.to(pen, {
              x: start.x,
              y: start.y,
              duration: RETRACE,
              ease: EASE.inOut,
              onUpdate: place,
            });
          }

          tl.to(route, {
            drawSVG: "0% 100%",
            duration: stroke.duration,
            ease: CustomEase.create(`plume-${i}`, stroke.ease),
            onUpdate(this: gsap.core.Tween) {
              const p = route.getPointAtLength(this.ratio * length);
              pen.x = p.x;
              pen.y = p.y;
              place();
            },
          });
        });

        tl.to(nib, { autoAlpha: 0, duration: DURATION.base, ease: EASE.soft }, "+=0.15");

        return canvas ? createInkPad(el, canvas) : undefined;
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.pad}>
      <svg
        className={styles.signature}
        viewBox={`${x} ${y} ${w} ${h}`}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {GROUPS.map((strokes, group) => (
            <mask
              key={group}
              id={`${uid}-ink-${group}`}
              className={styles.mask}
              maskUnits="userSpaceOnUse"
              x={x}
              y={y}
              width={w}
              height={h}
            >
              {strokes.map(({ stroke, index }) => (
                <path
                  key={index}
                  className={styles.route}
                  d={stroke.d}
                  strokeWidth={stroke.width}
                  data-route={index}
                />
              ))}
            </mask>
          ))}
          {PLUME_INK.map(({ clip }, group) =>
            clip ? (
              <clipPath key={group} id={`${uid}-clip-${group}`} clipPathUnits="userSpaceOnUse">
                <path d={clip} clipRule="evenodd" />
              </clipPath>
            ) : null,
          )}
        </defs>
        {PLUME_INK.map(({ d, clip }, group) => (
          <path
            key={group}
            className={styles.ink}
            d={d}
            mask={`url(#${uid}-ink-${group})`}
            clipPath={clip ? `url(#${uid}-clip-${group})` : undefined}
          />
        ))}
        <g data-nib className={styles.nibGroup}>
          <circle className={styles.nibHalo} r={5.5} />
          <circle className={styles.nib} r={2.4} />
        </g>
      </svg>
      <canvas className={styles.canvas} aria-hidden="true" />
    </div>
  );
}
