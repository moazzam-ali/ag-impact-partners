"use client";

import { useTranslations } from "next-intl";
import { type Ref, useImperativeHandle, useLayoutEffect, useRef } from "react";

import { LogoLockup } from "@/components/brand/logo-lockup";
import { gsap } from "@/lib/motion/gsap";

import { markBeat } from "./bend";
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
  Curtain "biais": cut on the bias of the A's leg (30 degrees off vertical, the logo's own angle).
  On the page's colour the lockup is traced and the wordmark rises over a hairline with a caption.
  Then the curtain leaves along that angle, a hairline of accent on its trailing edge, and the
  lockup stays exactly where it was while the edge crosses it. Page changes pass the curtain
  through in one sweep, both edges lined in accent, the mark held still at the centre (markBeat).

  The panel is a square tilted 30 degrees, as wide as the screen's diagonal, moved along its own
  normal; its contents are moved back the same distance and turned back, so they hold still.
*/
const TILT = 30;

export function CurtainBiais({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const t = useTranslations("hero");

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
        lockup: lockupParts(el),
        iconPlate: q("[data-icon-plate]"),
        icon: q("[data-icon]"),
        base: q("[data-base]"),
        plate: q("[data-plate]"),
      };
    };

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        gsap.set(p.iconPlate, { autoAlpha: 0 });
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
        await wait(0.45);
        await played(
          gsap
            .timeline()
            .add(onReveal, 0.05)
            .to(p.at, { x: p.R * 2, duration: 1, ease: "power2.inOut", onUpdate: p.slide }),
        );
        rest(p.el);
      },
      async swap(go, onReveal) {
        const p = parts();
        gsap.set([p.base, p.plate], { autoAlpha: 0 });
        gsap.set(p.iconPlate, { autoAlpha: 1 });
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
      <div className={styles.biaisTilt}>
        <div className={styles.biaisPanel} data-panel>
          <div className={styles.biaisHold} data-hold>
            <div className={styles.plate} data-plate>
              <div className={styles.frame}>
                <CurtainLockup />
                <Hairline caption={t("eyebrow")} />
              </div>
            </div>
            <div className={styles.plate} data-icon-plate>
              <LogoLockup part="mark" className={styles.icon} data-icon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
