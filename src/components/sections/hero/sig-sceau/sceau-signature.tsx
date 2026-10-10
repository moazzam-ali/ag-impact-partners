"use client";

import { useId, useRef } from "react";

import { gsap, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { SIGNATURE_INTRO } from "../signature-shell";
import { SCEAU_GLYPHS, SCEAU_PEN, SCEAU_VIEWBOX } from "./sceau-geometry";
import { createRelief, REST_LIGHT, type LightAngles } from "./sceau-relief";
import styles from "./sceau-signature.module.css";

/** Intro timing (seconds after mount). The pen starts while the headline is still rising. */
export const SCEAU_TIMING = {
  write: SIGNATURE_INTRO.signature,
  /** Time spent with the pen down; pen lifts are added on top. */
  writeDuration: 1.75,
  liftScale: 0.55,
  sinkGap: 0.15,
  sink: 1.2,
  sweep: 1.9,
} as const;

/** When the ink starts sinking into the paper (seconds after mount). */
export const SCEAU_SEAL_AT =
  SCEAU_TIMING.write +
  SCEAU_TIMING.writeDuration +
  SCEAU_PEN.reduce((sum, stroke) => sum + stroke.lift, 0) * SCEAU_TIMING.liftScale +
  SCEAU_TIMING.sinkGap;

/** Where the raking light starts its single sweep: low, from the right. */
const SWEEP_FROM: LightAngles = { az: (-12 * Math.PI) / 180, el: (11 * Math.PI) / 180 };

/*
  "Sceau": the signature is written in ink, then pressed into the paper. The ink is the font's
  outlines, revealed per letter through a mask of round-capped strokes that follow the skeleton in
  writing order (DrawSVG, constant pen speed). Then the ink fades while the WebGL relief rises, a
  raking light sweeps once across it and comes to rest from the top-left. After that the pointer is
  the light. Without WebGL the ink signature stays; under reduced motion the relief is shown still.
*/
export function SceauSignature() {
  const root = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useGSAP(
    () => {
      const el = root.current;
      const canvas = el?.querySelector<HTMLCanvasElement>("[data-paper]");
      const art = el?.querySelector<SVGSVGElement>("[data-art]");
      const ink = el?.querySelector<SVGGElement>("[data-ink]");
      if (!el || !canvas || !art || !ink) return;
      const relief = createRelief(el, canvas, art);
      const pens = SCEAU_PEN.map((stroke, si) =>
        stroke.chunks.map((_, ci) => el.querySelector<SVGPathElement>(`[data-pen="${si}-${ci}"]`)),
      );

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        if (!relief) return;
        relief.setRise(1);
        relief.setLight(REST_LIGHT);
        gsap.set(ink, { autoAlpha: 0 });
      });

      mm.add(MOTION_OK, () => {
        const T = SCEAU_TIMING;
        const all = pens.flat().filter((p): p is SVGPathElement => p !== null);
        gsap.set(all, { drawSVG: "0% 0%", visibility: "hidden" });
        relief?.setRise(0);
        relief?.setLight(SWEEP_FROM);

        const tl = gsap.timeline({ delay: T.write });
        SCEAU_PEN.forEach((stroke, si) => {
          if (stroke.lift) tl.to({}, { duration: stroke.lift * T.liftScale });
          stroke.chunks.forEach(([, , share], ci) => {
            const path = pens[si]?.[ci];
            if (!path) return;
            tl.set(path, { visibility: "visible" }).to(path, {
              drawSVG: "0% 100%",
              duration: share * T.writeDuration,
              ease: EASE.linear,
            });
          });
        });
        if (!relief) return;

        const seal = { rise: 0 };
        const light = { ...SWEEP_FROM };
        tl.addLabel("sink", `+=${T.sinkGap}`)
          .to(ink, { autoAlpha: 0, duration: T.sink, ease: EASE.inOut }, "sink")
          .to(
            seal,
            {
              rise: 1,
              duration: T.sink,
              ease: EASE.soft,
              onUpdate: () => relief.setRise(seal.rise),
            },
            "sink",
          )
          .to(
            light,
            {
              az: REST_LIGHT.az,
              el: REST_LIGHT.el,
              duration: T.sweep,
              ease: EASE.inOut,
              onUpdate: () => relief.setLight(light),
            },
            "sink+=0.1",
          )
          .call(() => relief.setInteractive(true));

        return () => relief.setInteractive(false);
      });

      return () => {
        mm.revert();
        relief?.destroy();
      };
    },
    { scope: root },
  );

  const { width, height } = SCEAU_VIEWBOX;
  return (
    <div ref={root} className={styles.sceau} aria-hidden="true">
      <canvas className={styles.paper} data-paper />
      <svg className={styles.art} viewBox={`0 0 ${width} ${height}`} data-art>
        <defs>
          {SCEAU_GLYPHS.map((_, gi) => (
            <mask
              key={gi}
              id={`${uid}-g${gi}`}
              className={styles.mask}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={width}
              height={height}
            >
              {SCEAU_PEN.map((stroke, si) =>
                stroke.glyph === gi
                  ? stroke.chunks.map(([d, w], ci) => (
                      <path
                        key={`${si}-${ci}`}
                        className={styles.pen}
                        d={d}
                        strokeWidth={w}
                        data-pen={`${si}-${ci}`}
                      />
                    ))
                  : null,
              )}
            </mask>
          ))}
        </defs>
        <g className={styles.ink} data-ink>
          {SCEAU_GLYPHS.map((d, gi) => (
            <path key={gi} d={d} mask={`url(#${uid}-g${gi})`} />
          ))}
        </g>
      </svg>
    </div>
  );
}
