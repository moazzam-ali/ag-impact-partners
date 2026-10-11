"use client";

import { useTranslations } from "next-intl";
import { type Ref, useId, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { MARK_PARTS, WORD_IMPACT, WORD_PARTNERS } from "@/components/brand/logo-parts";
import { gsap } from "@/lib/motion/gsap";

import { BendLayers, bendSwap } from "./bend";
import styles from "./curtain.module.css";
import { markStage, percent, readout, rest, stillSplash, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "sommet": peach floods out from the centre, the mark assembles from its three shapes and
  the wordmark rises letter by letter while a big count runs. Then the mark becomes a window: its
  ink gives way to the page behind, seen through the mark, and the window grows (zooming into the
  A's left leg) until the page is all there is. Page changes are the bending sheet (bend.tsx), in
  peach.

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
            duration: 1.05,
            ease: "power2.inOut",
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
        // Proxy Papers' icon burst: each shape pops in from nothing, turning slightly, elastic.
        const turn = [-15, 15, -10];
        p.shapes.forEach((shape, i) =>
          gsap.set(shape, {
            scale: 0,
            rotation: turn[i] ?? 0,
            autoAlpha: 0,
            transformOrigin: "50% 50%",
          }),
        );
        gsap.set(p.letters, { y: 260, autoAlpha: 0 });
        gsap.set(p.digits, { yPercent: 105, autoAlpha: 1 });
        gsap.set(p.notes, { autoAlpha: 0 });
        const build = gsap
          .timeline()
          .fromTo(
            p.svg,
            { clipPath: "circle(0% at 50% 46%)" },
            { clipPath: "circle(78% at 50% 46%)", duration: 1, ease: "power2.inOut" },
          )
          .set(p.base, { autoAlpha: 0 })
          .to(
            p.shapes,
            {
              scale: 1,
              rotation: 0,
              autoAlpha: 1,
              duration: 0.8,
              ease: "elastic.out(1, 0.5)",
              stagger: 0.2,
            },
            0.4,
          )
          .to(
            p.letters,
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              ease: "power3.out",
              stagger: 0.025,
            },
            1,
          )
          .to(p.digits, { yPercent: 0, duration: 0.6, ease: "power3.out" }, 0.7)
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
              duration: 0.3,
              ease: "power2.in",
              stagger: 0.012,
            })
            .to(p.digits, { yPercent: 105, duration: 0.35, ease: "power2.in" }, 0)
            .to(p.notes, { autoAlpha: 0, duration: 0.3 }, 0)
            .add(open(p, onReveal), 0.35),
        );
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.svg, p.notes], { autoAlpha: 0 });
        await bendSwap(p.el, go, onReveal, {}, reduced);
        gsap.set(p.svg, { autoAlpha: 1 });
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
      <p className={styles.sommetNote} data-note>
        {t("eyebrow")}
      </p>
      <p className={styles.bigCount}>
        <span className={styles.digits} data-digits>
          <span data-count>000</span>
        </span>
      </p>
      <BendLayers layers={[styles.bendPeach ?? ""]} mark={styles.bendMarkOnPeach} />
    </div>
  );
}
