"use client";

import { type RefObject } from "react";

import { afterCurtain } from "@/lib/motion/curtain";
import { EASE_OUT, gsap, useGSAP } from "@/lib/motion/gsap";
import { hasClientNavigated } from "@/lib/motion/nav-state";
import { REDUCED_MOTION } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

/*
  Pile 2's entrance, in the project's motion feel (docs/systems/motion.md, "Animation
  conventions"): the headline's words rise (0.55 s, 0.035 s apart), the eyebrow's and sub-line's
  words follow quickly (0.35 s, 0.008 s apart), then the buttons, figure and callout fade up. It
  waits for the curtain; after a page change it gives the transition time to uncover the top.

  Markup: [data-title] and [data-lead] hold <Words>; [data-rise] fade up.
*/
export function usePile2Hero(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const section = scope.current;
      if (!section) return;
      if (window.matchMedia(REDUCED_MOTION).matches) {
        section.setAttribute("data-state", "ready");
        return;
      }
      const q = gsap.utils.selector(section);
      const headline = q("[data-title] .word");
      const lead = q("[data-lead] .word");
      const rise = q("[data-rise]");
      armWords(section, [...headline, ...lead]);
      gsap.set(rise, { autoAlpha: 0, y: 16 });

      const intro = gsap
        .timeline({
          paused: true,
          delay: hasClientNavigated() ? 0.46 : 0.1,
          defaults: { ease: EASE_OUT, force3D: true },
        })
        .to(headline, { yPercent: 0, duration: 0.55, stagger: 0.035 }, 0)
        .to(lead, { yPercent: 0, duration: 0.35, stagger: 0.008 }, 0.15)
        .to(rise, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.35);
      return afterCurtain(() => intro.play());
    },
    { scope },
  );
}
