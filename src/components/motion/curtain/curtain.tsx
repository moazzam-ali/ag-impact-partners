"use client";

import { type Ref, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { MARK_PARTS } from "@/components/brand/logo-parts";
import { gsap } from "@/lib/motion/gsap";

import styles from "./curtain.module.css";
import {
  CurtainLockup,
  Hairline,
  lockupParts,
  lockupReadout,
  prepareLockup,
  settleLockup,
  wordsOut,
} from "./lockup";
import {
  type CurtainHandle,
  markBeat,
  markStageOver,
  played,
  rest,
  stillSplash,
  stillSwap,
  swapThrough,
  wait,
} from "./run";

/*
  The curtain. The splash: on the page's colour the mark is traced shape by shape as the page
  loads and the wordmark rises over a hairline loader that counts. Then the wordmark sinks and the
  mark becomes a window onto the page, edged in a hairline of accent, that zooms open (into the
  A's left leg) until the page is all there is.

  Page changes: a panel cut on the bias of the A's leg (30 degrees off vertical, the logo's own
  angle) crosses the screen in one sweep, both edges lined in accent, the mark held still at the
  centre as it covers (markBeat). The panel is a square tilted 30 degrees, as wide as the screen's
  diagonal, moved along its own normal; its contents are moved back the same distance and turned
  back, so they hold still. In the splash it is the ground the lockup is traced on.

  The window's SVG works in screen pixels (its viewBox is the viewport) and is laid over the traced
  lockup (markStageOver), so the window takes the mark's exact place.
*/
const TILT = 30;
const BIG = 50000;

export function Curtain({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const maskId = `curtain-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    root.current?.setAttribute("data-live", "");
  }, []);

  useImperativeHandle(ref, () => {
    const parts = () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const panel = q<HTMLElement>("[data-panel]")[0]!;
      const hold = q<HTMLElement>("[data-hold]")[0]!;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const R = Math.hypot(w, h) / 2 + 2;
      gsap.set(panel, { width: R * 2, height: R * 2, left: -R, top: -R });
      gsap.set(hold, { width: w, height: h, left: R - w / 2, top: R - h / 2, rotation: -TILT });
      const at = { x: 0 };
      /** Moves the panel across (0 covers the screen; ±2R is clear of it), holding its contents. */
      const slide = () => {
        gsap.set(panel, { x: at.x });
        gsap.set(hold, { x: -at.x, rotation: -TILT });
      };
      return {
        el,
        R,
        at,
        slide,
        panel,
        lockup: lockupParts(el),
        stage: q<SVGSVGElement>("[data-stage]")[0]!,
        places: q("[data-place]"),
        zooms: q("[data-zoom]"),
        plate: q("[data-plate]"),
        iconPlate: q("[data-icon-plate]"),
        icon: q("[data-icon]"),
        base: q("[data-base]"),
      };
    };
    type Parts = ReturnType<typeof parts>;

    /** The mark gives way to the page behind it, and the window opens until it is all page. */
    const open = (p: Parts, onReveal: () => void) => {
      const stage = markStageOver(p.stage, p.lockup.svg);
      p.places.forEach((g) => g.setAttribute("transform", stage.place));
      const zoom = (v: number) =>
        p.zooms.forEach((g) => g.setAttribute("transform", stage.zoom(v)));
      const z = { v: 0 };
      zoom(0);
      gsap.set(p.stage, { autoAlpha: 1 });
      gsap.set(p.panel, { autoAlpha: 0 });
      onReveal();
      return gsap.to(z, {
        v: 1,
        duration: 1.05,
        delay: 0.14,
        ease: "power2.inOut",
        onUpdate: () => zoom(z.v),
      });
    };

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        gsap.set([p.iconPlate, p.stage], { autoAlpha: 0 });
        gsap.set([p.panel, p.plate], { autoAlpha: 1 });
        p.at.x = 0;
        p.slide();
        const read = lockupReadout(p.lockup);
        if (reduced) {
          settleLockup(p.lockup);
          return stillSplash(p.el, loader, onReveal, read.show);
        }
        prepareLockup(p.lockup);
        gsap.set(p.base, { autoAlpha: 0 });
        const build = gsap
          .timeline()
          .fromTo(
            p.lockup.hair,
            { autoAlpha: 0, y: 6 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
            0.25,
          );
        await Promise.all([played(build), read.run(loader)]);
        read.rise();
        await read.words;
        await wait(0.35);
        await played(
          gsap
            .timeline()
            .to(p.lockup.hair, { autoAlpha: 0, duration: 0.35 })
            .add(wordsOut(p.lockup), 0),
        );
        await played(open(p, onReveal));
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.plate, p.stage], { autoAlpha: 0 });
        gsap.set([p.panel, p.iconPlate], { autoAlpha: 1 });
        if (reduced) {
          gsap.set(p.icon, { autoAlpha: 1, yPercent: 0 });
          p.at.x = 0;
          p.slide();
          return stillSwap(p.el, go, onReveal);
        }
        p.at.x = -p.R * 2;
        p.slide();
        p.el.dataset.state = "busy";
        const tl = gsap
          .timeline()
          .to(p.at, { x: 0, duration: 0.72, ease: "power2.inOut", onUpdate: p.slide })
          .addLabel("covered")
          .to(p.at, { x: p.R * 2, duration: 0.82, ease: "power2.inOut", onUpdate: p.slide });
        await swapThrough(markBeat(tl, p.icon[0], 0.72), go, onReveal);
        rest(p.el);
      },
    };
  }, [reduced]);

  return (
    <div ref={root} className={styles.root} data-curtain data-state="splash">
      <div className={styles.base} data-base />
      <div className={styles.tilt}>
        <div className={styles.panel} data-panel>
          <div className={styles.hold} data-hold>
            <div className={styles.plate} data-plate>
              <div className={styles.frame}>
                <CurtainLockup />
                <Hairline />
              </div>
            </div>
            <div className={styles.plate} data-icon-plate>
              <LogoLockup part="mark" className={styles.icon} data-icon />
            </div>
          </div>
        </div>
      </div>
      <svg className={styles.stage} data-stage aria-hidden="true">
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={-BIG}
            y={-BIG}
            width={BIG * 2}
            height={BIG * 2}
          >
            <rect x={-BIG} y={-BIG} width={BIG * 2} height={BIG * 2} fill="#fff" />
            <g data-zoom>
              <g data-place>
                <g fill="#000">
                  {MARK_PARTS.map((shape, i) => (
                    <path key={i} d={shape.d} />
                  ))}
                </g>
              </g>
            </g>
          </mask>
        </defs>
        <rect
          x={-BIG}
          y={-BIG}
          width={BIG * 2}
          height={BIG * 2}
          className={styles.ground}
          mask={`url(#${maskId})`}
        />
        <g data-zoom>
          <g data-place>
            <g className={styles.edge}>
              {MARK_PARTS.map((shape, i) => (
                <path key={i} d={shape.d} />
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
