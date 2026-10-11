"use client";

import { useTranslations } from "next-intl";
import { type Ref, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/motion/gsap";

import styles from "./curtain.module.css";
import { percent, readout, rest, stillSplash, stillSwap, swapThrough, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "fil": a hairline is drawn across the middle of the screen; the mark rises above it as
  if from behind it, the wordmark hangs below it, and the line fills with the accent as the page
  loads (the count at its end). Then the two go back into the line and the screen parts along it,
  top half up, bottom half down: two sides of the table. Page transitions close the halves on the
  line and part them again in one movement.
*/
/** Past the gap between the lockup and the line (--space-8 in CSS), so nothing peeks over it. */
const TUCK = 40;

export function CurtainFil({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
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
        top: q("[data-half='top']"),
        bottom: q("[data-half='bottom']"),
        line: q("[data-line]"),
        fill: q("[data-fill]"),
        mark: q("[data-rise]"),
        word: q("[data-hang]"),
        notes: q("[data-note]"),
        count: q<HTMLElement>("[data-count]")[0],
      };
    };
    /** The lockup tucked into the line, ready to come out of it. */
    const tuck = ({ mark, word }: ReturnType<typeof parts>) => {
      gsap.set(mark, { yPercent: 100, y: TUCK, autoAlpha: 1 });
      gsap.set(word, { yPercent: -100, y: -TUCK, autoAlpha: 1 });
    };
    const part = (p: ReturnType<typeof parts>, onReveal: () => void) =>
      gsap
        .timeline()
        .to(p.mark, { yPercent: 100, y: TUCK, duration: 0.5, ease: "power3.in" })
        .to(p.word, { yPercent: -100, y: -TUCK, duration: 0.5, ease: "power3.in" }, 0)
        .to(p.notes, { autoAlpha: 0, duration: 0.3 }, 0)
        .add(onReveal, 0.45)
        .to(p.top, { yPercent: -100, duration: 1.05, ease: "power4.inOut" }, 0.4)
        .to(p.bottom, { yPercent: 100, duration: 1.05, ease: "power4.inOut" }, 0.4)
        .to(p.line, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0.45);

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        if (reduced) {
          gsap.set([p.mark, p.word, p.notes], { autoAlpha: 1 });
          gsap.set(p.line, { scaleX: 1 });
          return stillSplash(p.el, loader, onReveal, (v) => {
            if (p.count) p.count.textContent = percent(v);
          });
        }
        tuck(p);
        gsap.set(p.fill, { scaleX: 0 });
        const build = gsap
          .timeline()
          .fromTo(p.line, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.inOut" })
          .to(p.mark, { yPercent: 0, y: 0, duration: 1, ease: "power4.out" }, 0.45)
          .to(p.word, { yPercent: 0, y: 0, duration: 1, ease: "power4.out" }, 0.6)
          .fromTo(p.notes, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0.8);
        const count = p.count;
        await Promise.all([
          played(build),
          readout(loader, (v) => {
            gsap.set(p.fill, { scaleX: v });
            if (count) count.textContent = percent(v);
          }),
        ]);
        await wait(0.25);
        await played(part(p, onReveal));
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set(p.notes, { autoAlpha: 0 });
        tuck(p);
        if (reduced) {
          gsap.set([p.top, p.bottom], { yPercent: 0 });
          gsap.set(p.line, { autoAlpha: 0 });
          return stillSwap(p.el, go, onReveal);
        }
        gsap.set(p.top, { yPercent: -100 });
        gsap.set(p.bottom, { yPercent: 100 });
        gsap.set(p.line, { scaleX: 0, autoAlpha: 1 });
        gsap.set(p.fill, { scaleX: 1 });
        p.el.dataset.state = "busy";
        // The halves meet on the line and part again, without stopping.
        await swapThrough(
          gsap
            .timeline()
            .to([p.top, p.bottom], { yPercent: 0, duration: 0.42, ease: "power3.in" })
            .to(p.line, { scaleX: 1, duration: 0.42, ease: "power2.in" }, 0)
            .addLabel("covered")
            .to(p.top, { yPercent: -100, duration: 0.62, ease: "power3.out" }, "covered")
            .to(p.bottom, { yPercent: 100, duration: 0.62, ease: "power3.out" }, "covered")
            .to(p.line, { autoAlpha: 0, duration: 0.3 }, "covered"),
          go,
          onReveal,
        );
        rest(p.el);
      },
    };
  }, [reduced]);

  return (
    <div ref={root} className={styles.root} data-curtain data-state="splash">
      <div className={cn(styles.half, styles.top)} data-half="top">
        <div className={styles.rise}>
          <LogoLockup part="mark" className={styles.filMark} data-rise />
        </div>
        <p className={styles.filNote} data-note>
          {t("eyebrow")}
        </p>
        <p className={cn(styles.filNote, styles.filCount)} data-note>
          <span data-count>000</span>
        </p>
      </div>
      <div className={cn(styles.half, styles.bottom)} data-half="bottom">
        <div className={styles.hang}>
          <LogoLockup part="word" className={styles.filWord} data-hang />
        </div>
      </div>
      <div className={styles.line} data-line>
        <span className={styles.fill} data-fill />
      </div>
    </div>
  );
}
