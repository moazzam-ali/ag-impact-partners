"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-salle.module.css";
import { createSalleScene } from "./salle-scene";

/*
  Hero study "salle" (direction: La Salle, Paris drawn in one line).

  Paris at dusk in hairlines draws itself upwards on load. The hero is three screens tall and pinned:
  scrolling flies one unbroken camera move over the roofs, down the boulevard, through the one lit
  window and onto the negotiating table, where two lines run in from either end and meet. The
  headline leaves as the flight starts and returns at the table. Reduced motion: the skyline, still,
  one screen tall.
*/

export function HeroSalle() {
  const t = useTranslations("hero");
  const ts = useTranslations("heroStudies.salle");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [canvas] = q<HTMLCanvasElement>("[data-canvas]");
      const [frameEl] = q<HTMLElement>("[data-frame]");
      const [hint] = q<HTMLElement>("[data-hint]");
      if (!canvas || !frameEl || !hint) return;
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const reduced = window.matchMedia(REDUCED_MOTION).matches;

      const scene = createSalleScene(canvas, {
        bg: token("--bg"),
        line: token("--ink"),
        accent: token("--accent"),
      });
      const s = { p: 0, target: 0, drawn: reduced ? 1 : 0, time: 0 };
      let visible = true;

      const fit = () => {
        scene.resize(canvas.clientWidth, canvas.clientHeight);
        scene.frame(s.p, s.drawn, s.time);
      };

      const tick = (_t: number, deltaMs: number) => {
        if (!visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        s.time += dt;
        s.p += (s.target - s.p) * (1 - Math.exp(-5 * dt));
        scene.frame(s.p, s.drawn, s.time);
        // The headline leaves as the flight starts and comes back at the table.
        const show = Math.max(1 - s.p / 0.1, (s.p - 0.9) / 0.1);
        frameEl.style.opacity = String(Math.min(1, Math.max(0, show)));
        hint.style.opacity = String(Math.max(0, 1 - s.p / 0.05));
      };

      const resize = new ResizeObserver(fit);
      resize.observe(canvas);
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });
      io.observe(el);

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        fit();
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        gsap
          .timeline({ delay: 0.1 })
          .to(s, { drawn: 1, duration: 2.4, ease: "power2.inOut" }, 0)
          .to(
            words,
            { yPercent: 0, duration: DURATION.words, stagger: STAGGER.words, ease: EASE.words },
            0.3,
          )
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 1.2);
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            s.target = self.progress;
          },
        });
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
      });

      return () => {
        resize.disconnect();
        io.disconnect();
        scene.dispose();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={cn(styles.hero, newsreader.variable, geistMono.variable)}
      data-theme="dark"
      data-state="pending"
    >
      <div className={styles.sticky}>
        <canvas className={styles.canvas} data-canvas aria-hidden="true" />
        <div className={styles.frame} data-frame>
          <p className={styles.eyebrow} data-chrome>
            {t("eyebrow")}
          </p>
          <h1 className={styles.headline} data-title>
            <span className={styles.line}>
              <Words text={t("title1")} />
            </span>{" "}
            <span className={styles.line}>
              <Words text={t("title2")} />
            </span>
          </h1>
        </div>
        <p className={styles.hint} data-hint>
          <span data-chrome>{ts("hint")}</span>
        </p>
      </div>
    </section>
  );
}
