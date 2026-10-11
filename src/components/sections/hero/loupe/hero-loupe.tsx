"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { archivo, newsreader } from "../study-fonts";
import styles from "./hero-loupe.module.css";
import { createLoupe, type Lens } from "./loupe-engine";

/*
  Hero study "loupe" (direction: Le Dossier, "read the fine print").

  The headline is set as a poster of heavy letters, and every letter is made of fine print: the
  contract's clauses, drifting slowly. A loupe follows the cursor (or wanders on its own on touch
  screens and before the first move) and magnifies the fine print so it can be read. The visible
  headline is drawn; the h1 carries the same words for assistive tech and search.
*/

const stripMarks = (body: string) =>
  body.replace(/<k>(.*?)<\/k>/g, "$1").replace(/<e>(.*?)\|.*?<\/e>/g, "$1");

function balance(text: string): string[] {
  const words = text.split(" ");
  let best = [text];
  let longest = Infinity;
  for (let cut = 1; cut < words.length; cut++) {
    const rows = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
    const l = Math.max(...rows.map((r) => r.length));
    if (l < longest) {
      longest = l;
      best = rows;
    }
  }
  return best;
}

export function HeroLoupe() {
  const t = useTranslations("hero");
  const tl = useTranslations("heroStudies.loupe");
  const studies = useMessages().heroStudies;
  const title1 = t("title1");
  const title2 = t("title2");
  // Four rows, so the letters are tall enough to be made of text; tall screens balance them too.
  const rows = [...balance(title1), ...balance(title2)].map((r) => r.toLocaleUpperCase());
  const finePrint = [
    studies.redline.contract.title,
    ...studies.redline.contract.articles.flatMap((a) => [a.title, stripMarks(a.body)]),
    studies.redline.contract.closing,
  ].join(" · ");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [canvas] = q<HTMLCanvasElement>("[data-canvas]");
      if (!canvas) return;
      const chrome = q<HTMLElement>("[data-chrome]");
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const fonts = { display: token("--font-archivo"), micro: token("--font-newsreader") };
      const reduced = window.matchMedia(REDUCED_MOTION).matches;

      const state = { reveal: reduced ? 1 : 0, glyphs: reduced ? 1 : 0, time: 0 };
      const lens: Lens = { x: 0, y: 0, r: 110, on: reduced ? 1 : 0 };
      const target = { x: 0, y: 0, active: false, last: -10 };
      let engine: ReturnType<typeof createLoupe> | null = null;
      let alive = true;
      let visible = true;

      const fit = () => {
        if (!engine) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        engine.resize(w, h, window.devicePixelRatio || 1);
        lens.r = Math.max(70, Math.min(130, w * 0.075));
        if (reduced) {
          lens.x = w * 0.36;
          lens.y = h * 0.42;
          engine.frame(0, lens);
        }
      };

      /** Where the loupe wanders when no one is steering it. */
      const wander = (time: number) => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        return {
          x: w * (0.5 + 0.36 * Math.sin(time * 0.23)),
          y: h * (0.5 + 0.16 * Math.sin(time * 0.37 + 1.2)),
        };
      };

      const tick = (_time: number, deltaMs: number) => {
        if (!engine || !visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        state.time += dt;
        const steering = target.active && state.time - target.last < 4;
        const goal = steering ? target : wander(state.time);
        const k = 1 - Math.exp(-(steering ? 12 : 3) * dt);
        lens.x += (goal.x - lens.x) * k;
        lens.y += (goal.y - lens.y) * k;
        engine.frame(state.time, lens, state.reveal, state.glyphs);
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = canvas.getBoundingClientRect();
        target.x = e.clientX - r.left;
        target.y = e.clientY - r.top;
        target.active = true;
        target.last = state.time;
      };
      const onLeave = () => {
        target.active = false;
      };

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        el.dataset.state = "ready";
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        gsap
          .timeline({ delay: 0.15 })
          .to(state, { glyphs: 1, duration: 0.5, ease: EASE.soft }, 0)
          .to(state, { reveal: 1, duration: 1.7, ease: "power2.inOut" }, 0.1)
          .to(lens, { on: 1, duration: 0.6, ease: EASE.soft }, 1.3)
          .to(chrome, { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE.soft }, 1.1);
      });

      void Promise.all([
        document.fonts.load(`900 100px ${fonts.display}`),
        document.fonts.load(`400 12px ${fonts.micro}`),
      ]).then(() => {
        if (!alive) return;
        engine = createLoupe(canvas, {
          rows,
          text: finePrint,
          fonts,
          colors: { ink: token("--ink"), faint: token("--loupe-faint") },
        });
        const start = wander(0);
        lens.x = start.x;
        lens.y = start.y;
        fit();
        if (!reduced) gsap.ticker.add(tick);
      });

      const resize = new ResizeObserver(fit);
      resize.observe(canvas);
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });
      io.observe(el);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        resize.disconnect();
        io.disconnect();
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={cn(styles.hero, archivo.variable, newsreader.variable)}
      data-theme="light"
      data-state="pending"
    >
      <canvas className={styles.canvas} data-canvas aria-hidden="true" />
      <h1 className="sr-only">
        {title1} {title2}
      </h1>
      <p className={styles.eyebrow} data-chrome>
        {t("eyebrow")}
      </p>
      <p className={styles.hint} data-chrome>
        {tl("hint")}
      </p>
    </section>
  );
}
