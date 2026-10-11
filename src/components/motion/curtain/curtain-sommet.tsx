"use client";

import { useTranslations } from "next-intl";
import { type Ref, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { MARK_PARTS, WORD_IMPACT, WORD_PARTNERS } from "@/components/brand/logo-parts";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/motion/gsap";

import styles from "./curtain.module.css";
import {
  markStage,
  percent,
  readout,
  rest,
  stillSplash,
  stillSwap,
  swapThrough,
  wait,
} from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "sommet": peach floods out from the centre, the mark assembles from its three shapes and
  the wordmark rises letter by letter while a big count runs. Then the mark becomes a window: its
  ink gives way to the page behind, seen through the mark, and the window grows (zooming into the
  A's left leg) until the page is all there is. Page changes sweep a peach sheet up over the page
  and on off the top, in one movement, with nothing on it.

  The SVG works in screen pixels (its viewBox is the viewport), so the lockup is placed in JS.
*/
const LOGO = { x: 59, y: 78, w: 3082, h: 894 };
/** A point inside the A's left leg (logo units): zooming into it fills the screen with the hole. */
const INTO = { x: 262, y: 640 };
const ZOOM = 110;
const BIG = 50000;

export function CurtainSommet({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const t = useTranslations("hero");
  const maskId = `sommet-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    root.current?.setAttribute("data-live", "");
  }, []);

  useImperativeHandle(ref, () => {
    const parts = () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const svg = q<SVGSVGElement>("svg")[0]!;
      const w = el.clientWidth;
      // The lockup: most of a phone's width, 42% of a wider screen, at most 620px.
      const stage = markStage(
        svg,
        LOGO,
        Math.min(w * (w < 768 ? 0.78 : 0.42), 620),
        0.46,
        INTO,
        ZOOM,
      );
      q("[data-place]").forEach((g) => g.setAttribute("transform", stage.place));
      const zoomEl = q("[data-zoom]")[0]!;
      const zoom = (v: number) => zoomEl.setAttribute("transform", stage.zoom(v));
      return {
        el,
        svg,
        zoom,
        base: q("[data-base]"),
        hole: q("[data-hole]"),
        shapes: q("[data-ink] [data-shape]"),
        letters: q("[data-ink] [data-letter]"),
        notes: q("[data-note]"),
        digits: q("[data-digits]"),
        scoop: q("[data-scoop]"),
        arc: `${Math.round(el.clientHeight * 0.16)}px`,
        count: q<HTMLElement>("[data-count]")[0],
      };
    };
    type Parts = ReturnType<typeof parts>;

    /** Ink out, window in: the page shows through the mark, then the window grows over it all. */
    const open = (p: Parts, onReveal: () => void) => {
      const z = { v: 0 };
      p.zoom(0);
      return gsap
        .timeline()
        .set(p.hole, { autoAlpha: 1 })
        .set(p.shapes, { autoAlpha: 0 })
        .add(onReveal, 0.2)
        .to(
          z,
          {
            v: 1,
            duration: 1.25,
            ease: "power3.in",
            onUpdate: () => p.zoom(z.v),
          },
          0.18,
        );
    };

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        gsap.set(p.svg, { autoAlpha: 1 });
        gsap.set(p.hole, { autoAlpha: 0 });
        if (reduced) {
          gsap.set(p.svg, { clipPath: "none" });
          gsap.set([p.notes, p.digits], { autoAlpha: 1 });
          return stillSplash(p.el, loader, onReveal, (v) => {
            if (p.count) p.count.textContent = percent(v);
          });
        }
        const from = [
          { x: -900, y: 500, rotation: -14 },
          { x: 700, y: 380, rotation: 18 },
          { x: 380, y: -700, rotation: 24 },
        ];
        p.shapes.forEach((shape, i) =>
          gsap.set(shape, { ...from[i], autoAlpha: 0, transformOrigin: "50% 50%" }),
        );
        gsap.set(p.letters, { y: 260, autoAlpha: 0 });
        gsap.set(p.digits, { yPercent: 105, autoAlpha: 1 });
        gsap.set(p.notes, { autoAlpha: 0 });
        const build = gsap
          .timeline()
          .fromTo(
            p.svg,
            { clipPath: "circle(0% at 50% 46%)" },
            { clipPath: "circle(78% at 50% 46%)", duration: 1, ease: "power3.inOut" },
          )
          .set(p.base, { autoAlpha: 0 })
          .to(
            p.shapes,
            {
              x: 0,
              y: 0,
              rotation: 0,
              autoAlpha: 1,
              duration: 1.1,
              ease: "power4.out",
              stagger: 0.12,
            },
            0.35,
          )
          .to(
            p.letters,
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.8,
              ease: "power3.out",
              stagger: 0.035,
            },
            0.75,
          )
          .to(p.digits, { yPercent: 0, duration: 0.8, ease: "power4.out" }, 0.6)
          .to(p.notes, { autoAlpha: 1, duration: 0.6 }, 0.9);
        const count = p.count;
        await Promise.all([
          played(build),
          readout(loader, (v) => {
            if (count) count.textContent = percent(v);
          }),
        ]);
        await wait(0.2);
        await played(
          gsap
            .timeline()
            .to(p.letters, {
              y: -200,
              autoAlpha: 0,
              duration: 0.45,
              ease: "power2.in",
              stagger: 0.02,
            })
            .to(p.digits, { yPercent: 105, duration: 0.5, ease: "power3.in" }, 0)
            .to(p.notes, { autoAlpha: 0, duration: 0.3 }, 0)
            .add(open(p, onReveal), 0.45),
        );
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.svg, p.notes], { autoAlpha: 0 });
        gsap.set(p.digits, { yPercent: 105 });
        if (reduced) {
          gsap.set(p.scoop, { autoAlpha: 1, yPercent: 0, "--arc": "0px", "--tail": "0px" });
          return stillSwap(p.el, go, onReveal);
        }
        // A peach sheet sweeps up over the page and on off the top: one pass, nothing on it.
        gsap.set(p.scoop, { autoAlpha: 1, yPercent: 101, "--arc": p.arc, "--tail": "0px" });
        p.el.dataset.state = "busy";
        await swapThrough(
          gsap
            .timeline()
            .to(p.scoop, { yPercent: 0, "--arc": "0px", duration: 0.5, ease: "power3.in" })
            .addLabel("covered")
            .to(p.scoop, { yPercent: -101, "--tail": p.arc, duration: 0.65, ease: "power3.out" }),
          go,
          onReveal,
        );
        gsap.set(p.svg, { autoAlpha: 1 });
        rest(p.el);
      },
    };
  }, [reduced]);

  return (
    <div ref={root} className={styles.root} data-curtain data-state="splash">
      <div className={styles.base} data-base />
      <svg className={styles.sommetSheet} aria-hidden="true">
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
          className={styles.peach}
          mask={`url(#${maskId})`}
        />
        <g data-place>
          <g data-ink className={styles.ink}>
            {MARK_PARTS.map((shape, i) => (
              <path key={i} d={shape.d} data-shape={i} />
            ))}
            {[...WORD_IMPACT, ...WORD_PARTNERS].map((letter, i) => (
              <path key={i} d={letter.d} data-letter />
            ))}
          </g>
        </g>
      </svg>
      <div className={cn(styles.sheet, styles.sheetPeach)} data-scoop />
      <p className={styles.sommetNote} data-note>
        {t("eyebrow")}
      </p>
      <p className={styles.bigCount}>
        <span className={styles.digits} data-digits>
          <span data-count>000</span>
        </span>
      </p>
    </div>
  );
}
