"use client";

import { useTranslations } from "next-intl";
import { type Ref, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { signature } from "@/components/sections/hero/signataire/strokes";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/motion/gsap";

import styles from "./curtain.module.css";
import { percent, readout, rest, stillSplash, stillSwap, swapThrough, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "feuillets": three sheets, ink, peach and paper, slide up one after another, each with a
  curved leading edge that flattens as it lands. On the paper the lockup builds (the mark's shapes,
  then the letters) and a signature is written under it as the loader. Then the sheets lift away
  in reverse order, their trailing edges curving, and the page is underneath. Page transitions
  sweep the sheets up over the page and on up off it, one pass.
*/

// The signature (Signataire's hand), as one path in its own box.
const SIGN = (() => {
  const [body = []] = signature(40, 560, 190, 7);
  const xs = body.map(([x]) => x);
  const ys = body.map(([, y]) => y);
  const x0 = Math.min(...xs) - 8;
  const y0 = Math.min(...ys) - 8;
  return {
    box: `0 0 ${Math.ceil(Math.max(...xs) - x0 + 8)} ${Math.ceil(Math.max(...ys) - y0 + 8)}`,
    d: body
      .map(([x, y], i) => `${i ? "L" : "M"}${(x - x0).toFixed(1)} ${(y - y0).toFixed(1)}`)
      .join(" "),
  };
})();

export function CurtainFeuillets({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const t = useTranslations("hero");

  useLayoutEffect(() => {
    root.current?.setAttribute("data-live", "");
  }, []);

  useImperativeHandle(ref, () => {
    const parts = () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      return {
        el,
        arc: `${Math.round(el.clientHeight * 0.22)}px`,
        base: q("[data-base]"),
        sheets: q("[data-sheet]"),
        shapes: q("[data-lockup] [data-shape]"),
        letters: q("[data-lockup] [data-letter]"),
        sign: q("[data-sign]"),
        notes: q("[data-note]"),
        count: q<HTMLElement>("[data-count]")[0],
      };
    };
    type Parts = ReturnType<typeof parts>;

    const lay = (p: Parts) => {
      gsap.set(p.sheets, { yPercent: 101, autoAlpha: 1, "--arc": p.arc, "--tail": "0px" });
      gsap.set(p.shapes, { scale: 0.55, autoAlpha: 0, transformOrigin: "50% 50%" });
      gsap.set(p.letters, { y: 220, autoAlpha: 0 });
      gsap.set(p.sign, { drawSVG: "0% 0%" });
      gsap.set(p.notes, { autoAlpha: 0 });
    };
    const slideIn = (p: Parts, duration: number, stagger: number) =>
      gsap
        .timeline()
        .to(p.sheets, { yPercent: 0, "--arc": "0px", duration, ease: "power4.inOut", stagger })
        .set(p.base, { autoAlpha: 0 }, duration);
    const liftOff = (p: Parts, onReveal: () => void) =>
      gsap
        .timeline()
        .to([...p.sheets].reverse(), {
          yPercent: -101,
          "--tail": p.arc,
          duration: 1.05,
          ease: "power4.inOut",
          stagger: 0.13,
        })
        .add(onReveal, 0.3);

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        if (reduced) {
          gsap.set(p.sheets, { autoAlpha: 1, yPercent: 0 });
          gsap.set(p.notes, { autoAlpha: 1 });
          return stillSplash(p.el, loader, onReveal, (v) => {
            if (p.count) p.count.textContent = percent(v);
          });
        }
        lay(p);
        const build = slideIn(p, 1, 0.14)
          .to(
            p.shapes,
            {
              scale: 1,
              autoAlpha: 1,
              duration: 0.8,
              ease: "power3.out",
              stagger: 0.08,
            },
            1,
          )
          .to(
            p.letters,
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.75,
              ease: "power3.out",
              stagger: 0.03,
            },
            1.15,
          )
          .to(p.notes, { autoAlpha: 1, duration: 0.6 }, 1.3);
        const count = p.count;
        await Promise.all([
          played(build),
          readout(loader, (v) => {
            gsap.set(p.sign, { drawSVG: `0% ${v * 100}%` });
            if (count) count.textContent = percent(v);
          }),
        ]);
        await wait(0.3);
        await played(liftOff(p, onReveal));
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set(p.base, { autoAlpha: 0 });
        gsap.set([p.shapes, p.letters, p.notes], { autoAlpha: 0 });
        gsap.set(p.sign, { drawSVG: "0% 0%" });
        if (reduced) {
          gsap.set(p.sheets, { autoAlpha: 1, yPercent: 0, "--arc": "0px", "--tail": "0px" });
          return stillSwap(p.el, go, onReveal);
        }
        gsap.set(p.sheets, { yPercent: 101, autoAlpha: 1, "--arc": p.arc, "--tail": "0px" });
        p.el.dataset.state = "busy";
        // The sheets sweep up over the page and on up off it: one pass.
        await swapThrough(
          gsap
            .timeline()
            .to(p.sheets, {
              yPercent: 0,
              "--arc": "0px",
              duration: 0.48,
              ease: "power3.in",
              stagger: 0.06,
            })
            .addLabel("covered")
            .to(
              [...p.sheets].reverse(),
              {
                yPercent: -101,
                "--tail": p.arc,
                duration: 0.65,
                ease: "power3.out",
                stagger: 0.06,
              },
              "covered",
            ),
          go,
          onReveal,
        );
        rest(p.el);
      },
    };
  }, [reduced]);

  return (
    <div ref={root} className={styles.root} data-curtain data-state="splash">
      <div className={styles.base} data-base />
      <div className={cn(styles.sheet, styles.sheetInk)} data-sheet />
      <div className={cn(styles.sheet, styles.sheetPeach)} data-sheet />
      <div className={cn(styles.sheet, styles.sheetPaper)} data-sheet>
        <div className={styles.lockup}>
          <LogoLockup className={styles.feuilleLogo} data-lockup />
          <svg className={styles.feuilleSign} viewBox={SIGN.box} aria-hidden="true">
            <path d={SIGN.d} data-sign />
          </svg>
        </div>
        <p className={styles.feuilleNote} data-note>
          {t("eyebrow")}
        </p>
        <p className={cn(styles.feuilleNote, styles.feuilleCount)} data-note>
          <span data-count>000</span>
        </p>
      </div>
    </div>
  );
}
