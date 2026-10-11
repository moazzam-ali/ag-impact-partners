"use client";

import { type RefObject } from "react";

import { afterCurtain } from "@/lib/motion/curtain";
import { EASE_STANDARD, gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { hasClientNavigated } from "@/lib/motion/nav-state";
import { MOTION_OK } from "@/lib/motion/tokens";

/*
  The running line of fields under Pile 2 (FilDomaines): drawn in from the left once the curtain
  opens (1.5 s, EASE_STANDARD, as Proxy Papers' clip reveals), then an endless loop that runs faster
  with the scroll, backwards when scrolling up, and almost stops under the pointer.

  Markup: [data-window] is clipped, [data-track] moves, [data-run] is one copy of the line.
*/
export function useFieldsLine(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const el = scope.current;
      const view = el?.querySelector<HTMLElement>("[data-window]");
      const track = el?.querySelector<HTMLElement>("[data-track]");
      const run = el?.querySelector<HTMLElement>("[data-run]");
      if (!el || !view || !track || !run) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        let loop: gsap.core.Tween | null = null;
        const build = () => {
          const progress = loop?.progress() ?? 0;
          loop?.kill();
          const width = run.offsetWidth;
          loop = gsap.fromTo(
            track,
            { x: 0 },
            { x: -width, duration: width / 32, ease: "none", repeat: -1 },
          );
          // Far into the repeats, so a reversed run (scrolling up) has room to go backwards.
          loop.totalTime(loop.duration() * (60 + progress));
        };
        build();
        const reveal = gsap.fromTo(
          view,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.5,
            ease: EASE_STANDARD,
            delay: hasClientNavigated() ? 0.66 : 0.3,
            paused: true,
          },
        );
        const stop = afterCurtain(() => reveal.play());

        let boost = 0;
        let calm = 1;
        let speed = 1;
        const tick = () => {
          boost *= 0.93;
          speed += (calm * (1 + boost) - speed) * 0.08;
          loop?.timeScale(speed);
        };
        gsap.ticker.add(tick);
        const enter = () => (calm = 0.16);
        const leave = () => (calm = 1);
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            boost = gsap.utils.clamp(-5, 5, self.getVelocity() / 280);
          },
        });
        const resize = new ResizeObserver(build);
        resize.observe(run);

        return () => {
          stop();
          gsap.ticker.remove(tick);
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
          resize.disconnect();
          loop?.kill();
        };
      });
      return () => mm.revert();
    },
    { scope },
  );
}
