"use client";

import { type RefObject } from "react";

import { afterCurtain } from "@/lib/motion/curtain";
import { EASE_OUT, gsap, scheduleRefresh, useGSAP } from "@/lib/motion/gsap";
import { hasClientNavigated } from "@/lib/motion/nav-state";
import { REDUCED_MOTION } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

/*
  The Expertise page's motion, in the project's feel (docs/systems/motion.md, "Animation
  conventions"). The header enters once the curtain opens: the heading's words rise (0.55 s,
  0.035 s apart), the eyebrow, lede and button fade up. Each field row reveals as it scrolls into
  view (once, at 78% of the viewport): its rule draws across, then the row rises.

  Markup: [data-title] holds <Words>; [data-in] fade up; each row has [data-rule] and [data-row].
*/
export function useExpertise(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;
      if (window.matchMedia(REDUCED_MOTION).matches) {
        section.setAttribute("data-state", "ready");
        return;
      }
      const q = gsap.utils.selector(section);
      const words = q("[data-title] .word");
      const enter = q("[data-in]");
      armWords(section, words);
      gsap.set(enter, { autoAlpha: 0, y: 16 });

      const intro = gsap
        .timeline({
          paused: true,
          delay: hasClientNavigated() ? 0.46 : 0.1,
          defaults: { ease: EASE_OUT, force3D: true },
        })
        .to(words, { yPercent: 0, duration: 0.55, stagger: 0.035 }, 0)
        .to(enter, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.2);
      // Rows in view at load would reveal behind the curtain, so their triggers start with it.
      const rows = q("[data-row]").map((row) => ({
        row,
        rule: row.parentElement?.querySelector("[data-rule]") ?? null,
      }));
      rows.forEach(({ row, rule }) => {
        gsap.set(row, { autoAlpha: 0, y: 24 });
        if (rule) gsap.set(rule, { scaleX: 0 });
      });
      const stop = afterCurtain(() => {
        intro.play();
        rows.forEach(({ row, rule }) =>
          gsap
            .timeline({
              defaults: { ease: EASE_OUT, force3D: true },
              scrollTrigger: { trigger: row, start: "top 78%", once: true },
            })
            .to(rule ?? [], { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, 0)
            .to(row, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.15),
        );
        scheduleRefresh();
      });
      return stop;
    },
    { scope },
  );
}
