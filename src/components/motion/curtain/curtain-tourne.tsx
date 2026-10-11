"use client";

import { type Ref, useImperativeHandle, useLayoutEffect, useRef } from "react";

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
} from "./lockup";
import { rest, stillSplash, stillSwap, swapThrough, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "tourne": a page turn, after feuillets but sideways. An ink sheet and then a paper one
  slide in from the right, their leading edges curved and flattening as they land, the paper's soft
  shadow falling on the ink; the lockup is traced on the paper and drifts against the movement. Then
  the paper and the ink carry on out to the left, trailing edges curving, like a page being turned.
  Page changes turn a page across the screen in one movement, nothing on it.
*/
export function CurtainTourne({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    root.current?.setAttribute("data-live", "");
  }, []);

  useImperativeHandle(ref, () => {
    const parts = () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      return {
        el,
        arc: `${Math.round(el.clientWidth * 0.12)}px`,
        base: q("[data-base]"),
        sheets: q("[data-sheet]"),
        plate: q("[data-plate]"),
        lockup: lockupParts(el),
      };
    };
    type Parts = ReturnType<typeof parts>;

    const lay = (p: Parts) =>
      gsap.set(p.sheets, { xPercent: 101, autoAlpha: 1, "--arc": p.arc, "--tail": "0px" });
    const turnIn = (p: Parts, duration: number, ease: string, stagger: number) =>
      gsap.timeline().to(p.sheets, { xPercent: 0, "--arc": "0px", duration, ease, stagger });
    const turnOut = (p: Parts, duration: number, ease: string, stagger: number) =>
      gsap
        .timeline()
        .to([...p.sheets].reverse(), { xPercent: -101, "--tail": p.arc, duration, ease, stagger });

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        const read = lockupReadout(p.lockup);
        if (reduced) {
          gsap.set(p.sheets, { autoAlpha: 1, xPercent: 0 });
          settleLockup(p.lockup);
          return stillSplash(p.el, loader, onReveal, read.show);
        }
        lay(p);
        prepareLockup(p.lockup);
        const build = turnIn(p, 1.15, "power4.inOut", 0.12)
          .fromTo(p.plate, { x: 90 }, { x: 0, duration: 1.4, ease: "power3.out" }, 0.25)
          .set(p.base, { autoAlpha: 0 }, 1.3)
          .fromTo(
            p.lockup.hair,
            { autoAlpha: 0, y: 6 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
            1,
          );
        await Promise.all([played(build), read.run(loader)]);
        read.rise();
        await read.words;
        await wait(0.4);
        await played(
          turnOut(p, 1.15, "power4.inOut", 0.12)
            .to(p.plate, { x: -110, duration: 1.15, ease: "power4.inOut" }, 0)
            .add(onReveal, 0.3),
        );
        gsap.set(p.plate, { clearProps: "transform" });
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.plate], { autoAlpha: 0 });
        if (reduced) {
          gsap.set(p.sheets, { autoAlpha: 1, xPercent: 0, "--arc": "0px", "--tail": "0px" });
          return stillSwap(p.el, go, onReveal);
        }
        lay(p);
        p.el.dataset.state = "busy";
        await swapThrough(
          gsap
            .timeline()
            .add(turnIn(p, 0.5, "power3.in", 0.07))
            .addLabel("covered")
            .add(turnOut(p, 0.65, "power3.out", 0.07), "covered"),
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
      <div className={cn(styles.hsheet, styles.inkOn)} data-sheet />
      <div className={cn(styles.hsheet, styles.paperOn, styles.lifted)} data-sheet>
        <div className={cn(styles.plate, styles.onPaper)} data-plate>
          <div className={styles.frame}>
            <CurtainLockup />
            <Hairline />
          </div>
        </div>
      </div>
    </div>
  );
}
