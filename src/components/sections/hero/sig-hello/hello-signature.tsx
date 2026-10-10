"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { SIGNATURE_INTRO } from "../signature-shell";
import { COOL_TIME, createHelloRenderer } from "./hello-renderer";
import styles from "./hello-signature.module.css";

/** When the pen first touches, in seconds after mount: while the headline is still rising. */
export const PEN_DOWN = SIGNATURE_INTRO.signature;

/*
  "ag impact", written like Apple's hello: one round monoline hand, at an even pen speed, in
  writing order, then a taut string of light the pointer can pluck. Reduced motion gets the finished
  signature, still.
*/
export function HelloSignature() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const renderer = createHelloRenderer(canvas);
      if (!renderer) return;

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        renderer.setClock(Number.POSITIVE_INFINITY);
      });

      mm.add(MOTION_OK, () => {
        const pen = { t: 0 };
        renderer.setClock(0);
        const { duration } = renderer.route;
        const settle = duration + COOL_TIME * 4;
        const tl = gsap.timeline({ delay: PEN_DOWN });
        tl.to(pen, {
          t: settle,
          duration: settle,
          ease: EASE.linear,
          onUpdate: () => renderer.setClock(pen.t),
        });
        tl.call(() => renderer.enableInteraction(), [], duration);
        tl.call(() => renderer.setClock(Number.POSITIVE_INFINITY));
      });

      return () => {
        mm.revert();
        renderer.destroy();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.root} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
