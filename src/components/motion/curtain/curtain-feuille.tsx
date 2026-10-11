"use client";

import { useTranslations } from "next-intl";
import { type Ref, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { gsap } from "@/lib/motion/gsap";

import { BendLayers, bendSwap } from "./bend";
import styles from "./curtain.module.css";
import {
  CurtainLockup,
  Hairline,
  lockupParts,
  lockupReadout,
  prepareLockup,
  settleLockup,
} from "./lockup";
import { rest, stillSplash, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "feuille": one sheet of paper, after feuillets. A sheet of accent 14px ahead of it shows
  as a thin rim along its curved leading edge, closing as the sheet lands. It rises over the page, flattening as it lands; the
  lockup is traced on it, drifting a little against the sheet's movement (it seems to have weight),
  and the wordmark rises over a hairline with a caption. Then the sheet lifts away, the rim
  trailing. Page changes are the bending sheet (bend.tsx) in paper, an accent rim leading it.
*/
const RIM = 14;

export function CurtainFeuille({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
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
        arc: `${Math.round(el.clientHeight * 0.16)}px`,
        base: q("[data-base]"),
        rim: q("[data-rim]"),
        sheet: q("[data-sheet]"),
        plate: q("[data-plate]"),
        lockup: lockupParts(el),
      };
    };
    type Parts = ReturnType<typeof parts>;

    /** Rim and sheet below the screen, leading edges curved. */
    const lay = (p: Parts) => {
      gsap.set([p.rim, p.sheet], { yPercent: 101, autoAlpha: 1, "--arc": p.arc, "--tail": "0px" });
      gsap.set(p.rim, { y: -RIM });
    };
    // The rim moves with the sheet, a fixed RIM px ahead going in and behind going out.
    const rise = (p: Parts, duration: number, ease: string) =>
      gsap
        .timeline()
        .to([p.rim, p.sheet], { yPercent: 0, "--arc": "0px", duration, ease })
        .to(p.rim, { y: 0, duration: duration * 0.5, ease: "power2.inOut" }, duration * 0.5);
    const leave = (p: Parts, duration: number, ease: string) =>
      gsap
        .timeline()
        .to([p.rim, p.sheet], { yPercent: -101, "--tail": p.arc, duration, ease })
        .fromTo(p.rim, { y: 0 }, { y: RIM, duration: duration * 0.4, ease: "power2.out" }, 0);

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        const read = lockupReadout(p.lockup);
        if (reduced) {
          gsap.set([p.rim, p.sheet], { autoAlpha: 1, yPercent: 0 });
          settleLockup(p.lockup);
          return stillSplash(p.el, loader, onReveal, read.show);
        }
        lay(p);
        prepareLockup(p.lockup);
        const build = rise(p, 0.95, "power2.inOut")
          .fromTo(p.plate, { y: 70 }, { y: 0, duration: 1.4, ease: "power3.out" }, 0.2)
          .set(p.base, { autoAlpha: 0 }, 1.2)
          .fromTo(
            p.lockup.hair,
            { autoAlpha: 0, y: 6 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
            0.9,
          );
        await Promise.all([played(build), read.run(loader)]);
        read.rise();
        await read.words;
        await wait(0.4);
        await played(
          leave(p, 0.95, "power2.inOut")
            .to(p.plate, { y: -90, duration: 0.95, ease: "power2.inOut" }, 0)
            .add(onReveal, 0.2),
        );
        gsap.set(p.plate, { clearProps: "transform" });
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.plate, p.rim, p.sheet], { autoAlpha: 0 });
        await bendSwap(p.el, go, onReveal, { gap: 1.6 }, reduced);
      },
    };
  }, [reduced]);

  return (
    <div ref={root} className={styles.root} data-curtain data-state="splash">
      <div className={styles.base} data-base />
      <div className={cn(styles.sheet, styles.rim)} data-rim />
      <div className={cn(styles.sheet, styles.paperOn)} data-sheet>
        <div className={cn(styles.plate, styles.onPaper)} data-plate>
          <div className={styles.frame}>
            <CurtainLockup />
            <Hairline caption={t("eyebrow")} />
          </div>
        </div>
      </div>
      <BendLayers layers={[styles.bendPeach ?? "", styles.bendPaper ?? ""]} />
    </div>
  );
}
