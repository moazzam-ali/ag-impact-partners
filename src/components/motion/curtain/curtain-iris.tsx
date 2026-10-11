"use client";

import { type Ref, useImperativeHandle, useLayoutEffect, useRef } from "react";

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
import { rest, stillSplash, stillSwap, swapThrough, wait } from "./run";
import { type CurtainHandle, played } from "./styles";

/*
  Curtain "iris": a disc in the page's colours inverted opens from the centre, a fine ring of accent
  riding its edge, and on it the lockup is traced and the wordmark rises over a counting hairline.
  Then the wordmark sinks and the iris closes onto the mark, which settles a little as it goes. A
  page change opens the iris from the link that was clicked and closes it on the next page, at the
  centre, with nothing on it.
*/

/** The mark's centre in logo units, measured from the logo's own origin (viewBox 59 78). */
const MARK_MID = { x: 667 - 59, y: 525 - 78 };
const LOGO_W = 3082;

export function CurtainIris({ ref, reduced }: { ref: Ref<CurtainHandle>; reduced: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    root.current?.setAttribute("data-live", "");
  }, []);

  useImperativeHandle(ref, () => {
    const parts = () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const disc = q<HTMLElement>("[data-disc]")[0]!;
      const ring = q<HTMLElement>("[data-ring]")[0]!;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const iris = { r: 0, x: w / 2, y: h / 2 };
      /** Draws the iris (the disc's clip and the ring on its edge) from `iris`. */
      const apply = () => {
        disc.style.clipPath = `circle(${iris.r}px at ${iris.x}px ${iris.y}px)`;
        gsap.set(ring, {
          x: iris.x - iris.r,
          y: iris.y - iris.r,
          width: iris.r * 2,
          height: iris.r * 2,
        });
      };
      /** The radius that covers the screen from (x, y). */
      const reach = (x: number, y: number) =>
        Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 2;
      return {
        el,
        w,
        h,
        iris,
        apply,
        reach,
        ring,
        lockup: lockupParts(el),
        base: q("[data-base]"),
        plate: q("[data-plate]"),
      };
    };

    return {
      async splash(loader, onReveal) {
        const p = parts();
        p.el.dataset.state = "busy";
        const read = lockupReadout(p.lockup);
        if (reduced) {
          Object.assign(p.iris, { r: p.reach(p.w / 2, p.h / 2) });
          p.apply();
          settleLockup(p.lockup);
          return stillSplash(p.el, loader, onReveal, read.show);
        }
        prepareLockup(p.lockup);
        p.apply();
        const build = gsap
          .timeline()
          .to(p.iris, {
            r: p.reach(p.w / 2, p.h / 2),
            duration: 1.15,
            ease: "power3.inOut",
            onUpdate: p.apply,
          })
          .fromTo(p.ring, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0)
          .to(p.ring, { autoAlpha: 0, duration: 0.4 }, 0.8)
          .set(p.base, { autoAlpha: 0 }, 1.15)
          .fromTo(
            p.lockup.hair,
            { autoAlpha: 0, y: 6 },
            { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" },
            0.5,
          );
        await Promise.all([played(build), read.run(loader)]);
        read.rise();
        await read.words;
        await wait(0.35);
        // Close on the mark: measure where it sits, move the iris's centre there (still covering).
        const r = p.lockup.svg.getBoundingClientRect();
        const k = r.width / LOGO_W;
        const mark = { x: r.left + MARK_MID.x * k, y: r.top + MARK_MID.y * k };
        await played(
          gsap
            .timeline()
            .to(p.lockup.hair, { autoAlpha: 0, duration: 0.35 })
            .add(wordsOut(p.lockup), 0)
            .call(
              () => {
                Object.assign(p.iris, { x: mark.x, y: mark.y, r: p.reach(mark.x, mark.y) });
                p.apply();
              },
              [],
              0.55,
            )
            .add(onReveal, 0.6)
            .to(p.ring, { autoAlpha: 1, duration: 0.3 }, 0.6)
            .to(p.iris, { r: 0, duration: 1.15, ease: "power3.inOut", onUpdate: p.apply }, 0.6)
            .to(
              p.lockup.svg,
              {
                scale: 0.84,
                transformOrigin: `${MARK_MID.x * k}px ${MARK_MID.y * k}px`,
                duration: 1.15,
                ease: "power3.inOut",
              },
              0.6,
            ),
        );
        gsap.set(p.lockup.svg, { clearProps: "transform" });
        rest(p.el);
      },
      async swap(go, onReveal, from) {
        const p = parts();
        gsap.set([p.base, p.plate], { autoAlpha: 0 });
        if (reduced) {
          Object.assign(p.iris, { r: p.reach(p.w / 2, p.h / 2) });
          p.apply();
          return stillSwap(p.el, go, onReveal);
        }
        const o = from ?? { x: p.w / 2, y: p.h / 2 };
        Object.assign(p.iris, { r: 0, x: o.x, y: o.y });
        p.apply();
        p.el.dataset.state = "busy";
        const centre = { x: p.w / 2, y: p.h / 2 };
        await swapThrough(
          gsap
            .timeline()
            .to(p.iris, {
              r: p.reach(o.x, o.y),
              duration: 0.55,
              ease: "power3.in",
              onUpdate: p.apply,
            })
            .fromTo(p.ring, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0)
            .addLabel("covered")
            // Covered: the iris re-centres on the screen (no visible change) and closes there.
            .call(() => {
              Object.assign(p.iris, { ...centre, r: p.reach(centre.x, centre.y) });
              p.apply();
            })
            .to(p.iris, { r: 0, duration: 0.8, ease: "power3.out", onUpdate: p.apply }, "covered"),
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
      <div className={styles.irisDisc} data-disc>
        <div className={styles.plate} data-plate>
          <div className={styles.frame}>
            <CurtainLockup />
            <Hairline />
          </div>
        </div>
      </div>
      <span className={styles.irisRing} data-ring />
    </div>
  );
}
