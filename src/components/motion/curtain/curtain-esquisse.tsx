"use client";

import { type Ref, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { MARK_PARTS } from "@/components/brand/logo-parts";
import { cn } from "@/lib/cn";
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
import { markStageOver, rest, stillSplash, stillSwap, swapThrough, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "esquisse": a proof on the press. A sheet of paper rises over the page (whatever its
  theme), four crop marks open at the corners, the loader traces
  the mark shape by shape (each filling as it closes) and the wordmark rises line by line, over a
  hairline that counts. Then the crop marks fold, the wordmark sinks, and the mark becomes a window
  onto the page that opens until it is all page (as in sommet), its edge drawn in a hairline of
  accent. Page changes wipe the paper up over the page and on off the top, an accent hairline on
  its moving edge.
*/
const BIG = 50000;
const CORNERS = ["tl", "tr", "bl", "br"] as const;

export function CurtainEsquisse({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const maskId = `esquisse-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    root.current?.setAttribute("data-live", "");
  }, []);

  useImperativeHandle(ref, () => {
    const parts = () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const lockup = lockupParts(el);
      const svg = q<SVGSVGElement>("[data-stage]")[0]!;
      const stage = markStageOver(svg, lockup.svg);
      q("[data-place]").forEach((g) => g.setAttribute("transform", stage.place));
      const zooms = q("[data-zoom]");
      return {
        el,
        lockup,
        svg,
        base: q("[data-base]"),
        sheet: q("[data-sheet]"),
        edgeLine: q("[data-edge-line]"),
        plate: q("[data-plate]"),
        crops: q("[data-crop]"),
        window: q("[data-hole], [data-edge]"),
        zoom: (v: number) => zooms.forEach((g) => g.setAttribute("transform", stage.zoom(v))),
      };
    };
    type Parts = ReturnType<typeof parts>;

    /** The mark gives way to the page behind it, and the window opens. */
    const open = (p: Parts, onReveal: () => void) => {
      const z = { v: 0 };
      p.zoom(0);
      return gsap
        .timeline()
        .set([p.svg, p.window], { autoAlpha: 1 })
        .set([p.base, p.sheet, p.plate], { autoAlpha: 0 })
        .add(onReveal)
        .to(z, { v: 1, duration: 1.25, ease: "power3.in", onUpdate: () => p.zoom(z.v) }, 0.14);
    };

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        gsap.set(p.svg, { autoAlpha: 0 });
        const read = lockupReadout(p.lockup);
        if (reduced) {
          gsap.set(p.sheet, { clipPath: "inset(0% 0 0 0)" });
          settleLockup(p.lockup);
          return stillSplash(p.el, loader, onReveal, read.show);
        }
        prepareLockup(p.lockup);
        gsap.set(p.crops, { scale: 0 });
        const build = gsap
          .timeline()
          .fromTo(
            p.sheet,
            { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0% 0 0 0)", duration: 0.9, ease: "power3.inOut" },
          )
          .set(p.base, { autoAlpha: 0 })
          .to(p.crops, { scale: 1, duration: 0.9, ease: "power3.out", stagger: 0.06 }, 0.6)
          .fromTo(
            p.lockup.hair,
            { autoAlpha: 0, y: 6 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
            0.75,
          );
        await Promise.all([played(build), read.run(loader)]);
        read.rise();
        await read.words;
        await wait(0.35);
        await played(
          gsap
            .timeline()
            .to(p.crops, { scale: 0, duration: 0.45, ease: "power2.in", stagger: 0.03 })
            .to(p.lockup.hair, { autoAlpha: 0, duration: 0.35 }, 0)
            .add(wordsOut(p.lockup), 0)
            .add(open(p, onReveal), 0.6),
        );
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.plate, p.svg], { autoAlpha: 0 });
        gsap.set(p.sheet, { autoAlpha: 1 });
        if (reduced) {
          gsap.set(p.sheet, { clipPath: "inset(0% 0 0% 0)" });
          return stillSwap(p.el, go, onReveal);
        }
        // The paper wipes up over the page and on off the top, a hairline of accent on its edge.
        const h = p.el.clientHeight;
        gsap.set(p.sheet, { clipPath: "inset(100% 0 0% 0)" });
        gsap.set(p.edgeLine, { autoAlpha: 1, y: h });
        p.el.dataset.state = "busy";
        await swapThrough(
          gsap
            .timeline()
            .to(p.sheet, { clipPath: "inset(0% 0 0% 0)", duration: 0.48, ease: "power3.in" })
            .to(p.edgeLine, { y: 0, duration: 0.48, ease: "power3.in" }, 0)
            .addLabel("covered")
            .set(p.edgeLine, { y: h }, "covered")
            .to(
              p.sheet,
              { clipPath: "inset(0% 0 100% 0)", duration: 0.65, ease: "power3.out" },
              "covered",
            )
            .to(p.edgeLine, { y: 0, duration: 0.65, ease: "power3.out" }, "covered"),
          go,
          onReveal,
        );
        gsap.set(p.edgeLine, { autoAlpha: 0 });
        gsap.set(p.sheet, { clipPath: "inset(100% 0 0% 0)" });
        rest(p.el);
      },
    };
  }, [reduced]);

  return (
    <div ref={root} className={styles.root} data-curtain data-state="splash">
      <div className={styles.base} data-base />
      <div className={styles.paperSheet} data-sheet />
      <span className={styles.edgeLine} data-edge-line />
      <div className={cn(styles.plate, styles.onPaper)} data-plate>
        <div className={styles.frame}>
          {CORNERS.map((corner) => (
            <span key={corner} className={styles.crop} data-crop data-corner={corner} />
          ))}
          <CurtainLockup />
          <Hairline />
        </div>
      </div>
      <svg className={styles.stageSvg} data-stage aria-hidden="true">
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
                <g data-hole fill="#000">
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
          className={styles.paperFill}
          mask={`url(#${maskId})`}
        />
        <g data-zoom>
          <g data-place>
            <g className={cn(styles.edge, styles.onPaper)} data-edge>
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
