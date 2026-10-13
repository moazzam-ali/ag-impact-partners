"use client";

import { type RefObject } from "react";

import { afterCurtain } from "@/lib/motion/curtain";
import { EASE_OUT, EASE_STANDARD, gsap, scheduleRefresh, useGSAP } from "@/lib/motion/gsap";
import { MOBILE_QUERY, REDUCED_MOTION, TABLET_QUERY } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

/** The house exit ease (power2.in): the headline leaving over the edge of the table. */
const EASE_IN = "power2.in";

/*
  A3 · Ce qui nous distingue, in the project's motion feel (docs/systems/motion.md, "Animation
  conventions"). One horizontal line splits the screen: the table. The headline stands on it; the
  pull line, the label and the body hang under it, the last two from the hinge (a knot on the
  line).

  Entering (once, as the line reaches 88% of the viewport): the line draws across (1.2 s,
  EASE_STANDARD), the headline's words rise out of the table (0.75 s, 0.07 s apart), the body's
  words follow (0.7 s, 0.016 s apart), the knot and the label fade up.

  Then one gesture, scrubbed by the scroll while the stage is held (CSS sticky, no pin): the table
  tips about the knot, carrying the headline; the headline turns over the edge, away from you, and
  comes back up on the near side (the view has crossed to the other side of the table); the table
  settles level and the pull line swings out from under it. The last third of the run is a hold,
  so the pull line can be read before the section scrolls on. Text is never mirrored: the headline
  goes out edge-on at 90° and returns from -90°, where it cannot be seen. On tablet and phone the
  pull line sits over the body, which steps down to make room for it; phones get a smaller tilt
  and a shorter run. With reduced motion the finished page shows at once.

  Markup: [data-run] is the tall scroll run (the hook's scope); [data-table] tips (line, knot,
  headline, label); [data-line] is the table's edge, [data-knot] the hinge; [data-face] is the
  headline (holding <Words>); [data-label] fades up; [data-body] holds <Words>; [data-pull] is the
  pull line; [data-below] is the block under the line, the entrance's trigger.
*/
export function useWhyUs(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    (_context, contextSafe) => {
      const run = scope.current;
      if (!run || !contextSafe) return;
      if (window.matchMedia(REDUCED_MOTION).matches) {
        run.setAttribute("data-state", "ready");
        return;
      }
      const q = gsap.utils.selector(run);
      const [table] = q<HTMLElement>("[data-table]");
      const [line] = q<HTMLElement>("[data-line]");
      const [face] = q<HTMLElement>("[data-face]");
      const [pull] = q<HTMLElement>("[data-pull]");
      const [below] = q<HTMLElement>("[data-below]");
      const [body] = q<HTMLElement>("[data-body]");
      const [knot] = q<HTMLElement>("[data-knot]");
      if (!table || !line || !face || !pull || !below || !body || !knot) return;
      const title = q("[data-face] .word");
      const words = q("[data-body] .word");
      const label = q("[data-label]");

      // Release the pending CSS first, then set every start value in GSAP's own units.
      armWords(run, [...title, ...words]);
      gsap.set(label, { autoAlpha: 0, y: 16 });
      gsap.set(line, { scaleX: 0 });
      gsap.set(knot, { autoAlpha: 0, scale: 0 });
      gsap.set(face, { transformPerspective: 1300, rotationX: 0 });
      gsap.set(pull, { transformPerspective: 900, rotationX: -90, autoAlpha: 1 });

      const small = () => window.matchMedia(MOBILE_QUERY).matches;
      // Tablet and phone stack the pull line over the body: the body waits right under the line
      // and steps down as the pull line swings out above it.
      const room = () => (window.matchMedia(TABLET_QUERY).matches ? -pull.offsetHeight : 0);

      const start = contextSafe(() => {
        gsap
          .timeline({
            defaults: { ease: EASE_OUT, force3D: true },
            scrollTrigger: { trigger: below, start: "top 88%", once: true },
          })
          .to(line, { scaleX: 1, duration: 1.2, ease: EASE_STANDARD }, 0)
          .to(title, { yPercent: 0, duration: 0.75, stagger: 0.07 }, 0.2)
          .to(words, { yPercent: 0, duration: 0.7, stagger: 0.016 }, 0.55)
          .to(knot, { autoAlpha: 1, scale: 1, duration: 0.5 }, 0.6)
          .to(label, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.7);

        // Ten units of scroll: a short rest, the crossing, a long hold. Scrubbed, so the eases
        // shape each move within the run rather than in time. Every move states both ends, so a
        // refresh in the middle of the run never records a wrong start.
        const tilt = () => (small() ? 1.2 : 2.2);
        gsap
          .timeline({
            defaults: { ease: "none", force3D: true, immediateRender: false },
            scrollTrigger: {
              trigger: run,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(table, { rotation: 0 }, { rotation: tilt, duration: 2, ease: EASE_STANDARD }, 0.5)
          .fromTo(face, { rotationX: 0 }, { rotationX: 90, duration: 1.7, ease: EASE_IN }, 1.1)
          .fromTo(face, { rotationX: -90 }, { rotationX: 0, duration: 1.9, ease: EASE_OUT }, 2.8)
          .fromTo(table, { rotation: tilt }, { rotation: 0, duration: 2.2, ease: EASE_STANDARD }, 3)
          // Stacked layouts: the body holds just under the line until the pull line comes.
          .fromTo(body, { y: room }, { y: room, duration: 4.4, immediateRender: true }, 0)
          .fromTo(pull, { rotationX: -90 }, { rotationX: 0, duration: 2, ease: EASE_OUT }, 4.4)
          .fromTo(body, { y: room }, { y: 0, duration: 2, ease: EASE_OUT }, 4.4)
          // The hold: nothing moves from 6.4 to 10 (the headline is already level; this only keeps
          // the run that long).
          .fromTo(face, { rotationX: 0 }, { rotationX: 0, duration: 3.6 }, 6.4);

        scheduleRefresh();
      });

      return afterCurtain(start);
    },
    { scope },
  );
}
