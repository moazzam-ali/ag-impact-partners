"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-popup.module.css";
import { createPopupScene } from "./popup-scene";

/*
  Hero study "popup" (direction: La Salle meets the paper of Pile).

  A cloth-bound book on a pale desk opens and Paris rises out of it in cut paper, layer by layer,
  with one window lit. The cursor tilts the view so the layers part; scrolling away closes the
  book. Reduced motion: the book open, still.
*/

export function HeroPopup() {
  const t = useTranslations("hero");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [canvas] = q<HTMLCanvasElement>("[data-canvas]");
      if (!canvas) return;
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const reduced = window.matchMedia(REDUCED_MOTION).matches;

      const scene = createPopupScene(canvas, {
        serif: token("--font-newsreader"),
        ground: token("--popup-ground"),
        cloth: token("--popup-cloth"),
        paper: token("--paper"),
        paperShade: token("--print-rule"),
        line: token("--print-soft"),
        ink: token("--print"),
        accent: token("--accent"),
        light: token("--lamp"),
      });
      const s = { intro: reduced ? 1 : 0, scroll: 0 };
      let visible = true;
      const open = () => s.intro * (1 - s.scroll * 0.85);
      const fit = () => {
        scene.resize(canvas.clientWidth, canvas.clientHeight);
        scene.frame(open());
      };
      const tick = () => {
        if (visible) scene.frame(open());
      };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        scene.setPointer(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          ((e.clientY - r.top) / r.height) * 2 - 1,
        );
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
          .timeline({ delay: 0.15 })
          .to(words, {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.4)
          .to(s, { intro: 1, duration: 2.8, ease: "power2.inOut" }, 0.35);
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom top",
          onUpdate: (self) => {
            s.scroll = self.progress;
          },
        });
        gsap.ticker.add(tick);
        el.addEventListener("pointermove", onMove);
        return () => {
          gsap.ticker.remove(tick);
          el.removeEventListener("pointermove", onMove);
        };
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
      data-theme="light"
      data-state="pending"
    >
      <canvas className={styles.canvas} data-canvas aria-hidden="true" />
      <div className={styles.frame}>
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
    </section>
  );
}
