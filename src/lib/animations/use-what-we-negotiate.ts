"use client";

import { type RefObject } from "react";

import { afterCurtain } from "@/lib/motion/curtain";
import {
  EASE_OUT,
  EASE_STANDARD,
  gsap,
  ScrollTrigger,
  scheduleRefresh,
  useGSAP,
} from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

/*
  A2 · Ce que nous négocions, in the project's feel (docs/systems/motion.md, "Animation
  conventions"). One idea: the four things the firm negotiates take their turn in one slot.

  The section is taller than the screen and its stage is CSS sticky for the run (no pin). The run
  is cut into four steps; crossing a threshold swaps the phrase as a whole, never half way: the
  words of the one on show leave upwards (power2.in, 0.3 s) and, as they clear, the next one's
  words rise in (0.75 s, 0.07 s apart, as section titles). Scrolling back plays it the other way
  round: the phrase sinks into the line and the one before comes down. The hairline under the
  phrase fills a quarter per step (EASE_STANDARD, 0.9 s) and that step's number turns ink. The last
  phrase holds longest, so the statement can be read before the stage moves on.

  The intro plays once as the section comes into view (top at 78%), after the curtain: the label
  and the current phrase rise, the hairline draws across, the statement's words follow (0.7 s,
  0.016 s apart) and the numbers and client line fade up. The client line then drifts left to
  right, slowly and evenly (no scroll boost, no pause on hover: it is not the hero's fields line),
  only while the section is on screen.

  Two branches (gsap.matchMedia), the same two the CSS has: the sequence, or the still page (the
  four stacked) for reduced motion, no script, or a screen too short to hold the stage (a phone
  on its side). Turning a phone round swaps one for the other; the still page's CSS overrules
  whatever GSAP's revert of the sequence leaves on the words.

  Markup: the section has [data-sequence]; the stage (scope) holds [data-label] and
  [data-statement] with <Words>, one [data-item] per phrase with <Words>, [data-rule] (the
  hairline) and [data-fill] (its fill under the phrase), one [data-mark] per step, [data-rise] fade
  up, [data-drift] moves, [data-copy] is one copy of the client line.
*/

/** Where the CSS lays out the sequence (what-we-negotiate.module.css); elsewhere the still page. */
const SEQUENCE = `${MOTION_OK} and (scripting: enabled) and (min-height: 480px)`;
/** Where the CSS holds the still page whatever a revert of the sequence left on the elements. */
const STILL = `${REDUCED_MOTION}, (max-height: 479.98px)`;
/** Exits, as in the house table: a phrase leaving before the next one rises. */
const EASE_EXIT = "power2.in";
/** Where the run (0 to 1) hands over to the second, third and fourth phrase. */
const STEPS = [0.16, 0.42, 0.68];
/** The client line's speed in px per second, under half the fields line's. */
const DRIFT = 14;

export function useWhatWeNegotiate(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const stage = scope.current;
      const section = stage?.closest<HTMLElement>("[data-sequence]");
      if (!stage || !section) return;
      const ready = () => stage.setAttribute("data-state", "ready");
      // Wherever the sequence does not run, the still page shows, words and all (this also covers
      // a browser that cannot read SEQUENCE).
      if (!window.matchMedia(SEQUENCE).matches) ready();
      const mm = gsap.matchMedia();

      mm.add(STILL, ready);

      mm.add(SEQUENCE, () => {
        const q = gsap.utils.selector(stage);
        const label = q("[data-label] .word");
        const items = q("[data-item]").map((item) => gsap.utils.toArray<Element>(".word", item));
        const statement = q("[data-statement] .word");
        const rule = q("[data-rule]");
        const fill = q("[data-fill]");
        const marks = q("[data-mark]");
        const rise = q("[data-rise]");
        const [drift] = q<HTMLElement>("[data-drift]");
        const [copy] = q<HTMLElement>("[data-copy]");
        if (!items.length || !drift || !copy) return;
        const words = [...label, ...items.flat(), ...statement];

        armWords(stage, words);
        gsap.set(rise, { autoAlpha: 0, y: 16 });
        gsap.set([...rule, ...fill], { scaleX: 0 });

        // ---- The steps ----
        const last = items.length - 1;
        const stepAt = (progress: number) =>
          Math.min(last, STEPS.filter((at) => progress >= at).length);
        let shown = -1;
        // `hold` delays the fill: on the intro it waits for the hairline to be drawn under it.
        const go = (next: number, hold = 0) => {
          if (next === shown) return;
          const prev = shown;
          const down = next > prev;
          shown = next;
          // A fast scroll can cross several thresholds: only the one leaving and the one coming
          // move, the rest are put away at once.
          items.forEach((phrase, i) => {
            if (i === prev || i === next) return;
            gsap.killTweensOf(phrase);
            gsap.set(phrase, { yPercent: 112 });
          });
          const leaving = items[prev];
          if (leaving) {
            gsap.to(leaving, {
              yPercent: down ? -112 : 112,
              duration: 0.3,
              ease: EASE_EXIT,
              stagger: 0.015,
              overwrite: true,
            });
          }
          const coming = items[next];
          if (coming) {
            gsap.fromTo(
              coming,
              { yPercent: down ? 112 : -112 },
              {
                yPercent: 0,
                duration: 0.75,
                ease: EASE_OUT,
                stagger: 0.07,
                delay: leaving ? 0.2 : 0,
                force3D: true,
                overwrite: true,
              },
            );
          }
          gsap.to(fill, {
            scaleX: (next + 1) / items.length,
            duration: 0.9,
            ease: EASE_STANDARD,
            delay: hold,
            overwrite: true,
          });
          marks.forEach((mark, i) => mark.toggleAttribute("data-on", i === next));
        };

        // ---- The client line ----
        let loop: gsap.core.Tween | null = null;
        let revealed = false;
        let onScreen = false;
        const run = () => {
          if (revealed && onScreen) loop?.play();
          else loop?.pause();
        };
        const build = () => {
          const progress = loop?.progress() ?? 0;
          loop?.kill();
          const width = copy.offsetWidth;
          if (!width) return;
          loop = gsap.fromTo(
            drift,
            { x: -width },
            { x: 0, duration: width / DRIFT, ease: EASE.linear, repeat: -1, paused: true },
          );
          loop.progress(progress);
          run();
        };
        build();
        const resize = new ResizeObserver(build);
        resize.observe(copy);
        // Anything above that changes height (the hero settling its type) moves the run.
        const page = new ResizeObserver(scheduleRefresh);
        if (section.parentElement) page.observe(section.parentElement);

        // Triggers start with the curtain: the section in view at load would otherwise reveal
        // behind it. Made later than this branch, so they are kept here and killed with it.
        const made: { kill: () => void }[] = [];
        const stop = afterCurtain(() => {
          let ready = false;
          const steps = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => ready && go(stepAt(self.progress)),
            onRefresh: (self) => ready && go(stepAt(self.progress)),
          });
          const view = ScrollTrigger.create({
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              onScreen = self.isActive;
              run();
            },
          });
          const intro = gsap
            .timeline({
              defaults: { ease: EASE_OUT, force3D: true },
              scrollTrigger: { trigger: section, start: "top 78%", once: true },
            })
            .to(label, { yPercent: 0, duration: 0.7, stagger: 0.016 }, 0)
            .call(
              () => {
                ready = true;
                go(stepAt(steps.progress), 0.45);
              },
              [],
              0.08,
            )
            .to(rule, { scaleX: 1, duration: 1.2, ease: EASE_STANDARD }, 0.1)
            .to(statement, { yPercent: 0, duration: 0.7, stagger: 0.016 }, 0.4)
            .to(rise, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.55)
            .call(
              () => {
                revealed = true;
                run();
              },
              [],
              0.55,
            );
          made.push(steps, view, intro);
          scheduleRefresh();
        });

        return () => {
          stop();
          resize.disconnect();
          page.disconnect();
          made.forEach((m) => m.kill());
          loop?.kill();
          gsap.killTweensOf([...words, ...fill]);
        };
      });

      return () => mm.revert();
    },
    { scope },
  );
}
