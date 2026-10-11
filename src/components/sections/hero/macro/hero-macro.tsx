"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { type DocCopy } from "../signataire/documents";
import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-macro.module.css";
import { createMacroScene, STILL_AT } from "./macro-scene";

/*
  Hero study "macro" (direction: the signature, in macro).

  Opens a few centimetres from a fountain pen's nib, low over the paper, shallow focus, following
  the nib as it writes the signature in wet ink. The pen lifts and lies down beside the page; the
  camera pulls back to the whole signed contract on a dark desk. The headline is there from the
  start, dark over the paper, and turns light as the desk comes into view. Reduced motion: the
  final frame.
*/

const stripMarks = (body: string) =>
  body.replace(/<k>(.*?)<\/k>/g, "$1").replace(/<e>(.*?)\|.*?<\/e>/g, "$1");
/** When the frame has pulled back far enough for the headline to turn light. */
const WIDE_AT = 5.6;

export function HeroMacro() {
  const t = useTranslations("hero");
  const studies = useMessages().heroStudies;
  const articles = studies.redline.contract.articles;
  const copy: DocCopy = {
    title: studies.signataire.docs[0] ?? "",
    ref: studies.signataire.ref,
    between: [studies.signataire.between[0] ?? "", studies.signataire.between[1] ?? ""],
    clauses: articles.slice(0, 3).map((a) => ({ title: a.title, body: stripMarks(a.body) })),
    place: studies.signataire.place,
    parties: [studies.signataire.parties[0] ?? "", studies.signataire.parties[1] ?? ""],
  };
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
      const fonts = { serif: token("--font-newsreader"), mono: token("--font-mono") };
      const reduced = window.matchMedia(REDUCED_MOTION).matches;
      let scene: ReturnType<typeof createMacroScene> | null = null;
      let clock = reduced ? STILL_AT : 0;
      let visible = true;
      let alive = true;

      const fit = () => {
        scene?.resize(canvas.clientWidth, canvas.clientHeight);
        scene?.frame(clock);
      };
      const tick = (_t: number, deltaMs: number) => {
        if (!scene || !visible) return;
        clock += Math.min(0.05, deltaMs / 1000);
        scene.frame(clock);
        el.dataset.phase = clock > WIDE_AT ? "wide" : "macro";
      };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        scene?.setPointer(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          ((e.clientY - r.top) / r.height) * 2 - 1,
        );
      };

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        el.dataset.phase = "wide";
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
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.4);
      });

      void Promise.all([
        document.fonts.load(`400 58px ${fonts.serif}`),
        document.fonts.load(`italic 400 26px ${fonts.serif}`),
        document.fonts.load(`500 19px ${fonts.mono}`),
      ]).then(() => {
        if (!alive) return;
        scene = createMacroScene({
          canvas,
          copy,
          fonts,
          colors: {
            desk: token("--desk"),
            light: token("--lamp"),
            lacquer: token("--lacquer"),
            metal: token("--accent"),
            ink: token("--sign-ink"),
            paper: token("--paper"),
            print: token("--print"),
            soft: token("--print-soft"),
            rule: token("--print-rule"),
          },
        });
        fit();
        el.dataset.scene = "ready";
        if (!reduced) {
          gsap.ticker.add(tick);
          el.addEventListener("pointermove", onMove);
        }
      });

      const resize = new ResizeObserver(fit);
      resize.observe(canvas);
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });
      io.observe(el);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        el.removeEventListener("pointermove", onMove);
        resize.disconnect();
        io.disconnect();
        scene?.dispose();
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
      data-phase="macro"
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
