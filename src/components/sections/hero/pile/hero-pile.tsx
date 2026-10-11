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
import styles from "./hero-pile.module.css";
import { createPileScene, SHEETS } from "./pile-scene";

/*
  Hero study "pile" (direction: Le Dossier, the figure made physical).

  Three hundred contract sheets land one after another into a ream on a pale studio ground while a
  counter keeps pace; the top sheet is a signed contract. Move across the hero and the ream riffles
  open under the cursor, sheet by sheet; the counter shows which sheet you are on. Reduced motion:
  the finished ream, closed.

  The "contrats négociés" label for 300 is still to be confirmed by the client.
*/

const stripMarks = (body: string) =>
  body.replace(/<k>(.*?)<\/k>/g, "$1").replace(/<e>(.*?)\|.*?<\/e>/g, "$1");

/** How many sheets have landed by `time`: the inverse of landsAt. */
const landed = (time: number) =>
  Math.min(
    SHEETS,
    Math.max(0, Math.floor(SHEETS * Math.max(0, (time - 0.25) / 2.3) ** (1 / 0.78))),
  );

export function HeroPile() {
  const t = useTranslations("hero");
  const tp = useTranslations("heroStudies.pile");
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
      const [count] = q<HTMLElement>("[data-count]");
      const [sheetNo] = q<HTMLElement>("[data-sheet]");
      if (!canvas || !count || !sheetNo) return;
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const reduced = window.matchMedia(REDUCED_MOTION).matches;
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const fonts = { serif: token("--font-newsreader"), mono: token("--font-mono") };

      const riffle = { level: SHEETS, amount: 0, target: SHEETS, on: 0, last: -10 };
      let clock = reduced ? 10 : 0;
      let visible = true;
      let alive = true;
      let scene: ReturnType<typeof createPileScene> | null = null;
      let shown = -1;

      const fit = () => {
        scene?.resize(canvas.clientWidth, canvas.clientHeight);
        if (reduced) scene?.frame(clock, SHEETS, 0);
      };

      const tick = (_t: number, deltaMs: number) => {
        if (!scene || !visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        clock += dt;
        // Before anyone steers it (and after a pause), the ream riffles itself once in a while.
        const idle = clock - riffle.last > 3;
        if (idle && clock > 3.2) {
          const phase = ((clock - 3.2) % 7) / 7;
          riffle.target = phase < 0.45 ? SHEETS - Math.sin((phase / 0.45) * Math.PI) * 190 : SHEETS;
          riffle.on = phase < 0.45 ? 1 : 0;
        }
        const k = 1 - Math.exp(-6 * dt);
        riffle.level += (riffle.target - riffle.level) * k;
        riffle.amount += (riffle.on - riffle.amount) * k;
        scene.frame(clock, riffle.level, riffle.amount);

        const n = clock < 3 ? landed(clock) : SHEETS;
        if (n !== shown) {
          shown = n;
          count.textContent = String(n);
        }
        sheetNo.textContent = String(Math.max(1, Math.round(riffle.level))).padStart(3, "0");
        el.dataset.riffle = riffle.amount > 0.2 ? "on" : "off";
      };

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        // Right of centre: the further left you go, the deeper into the ream.
        riffle.target = SHEETS * Math.min(1, Math.max(0.02, (x - 0.42) / 0.5));
        riffle.on = x > 0.42 ? 1 : 0;
        riffle.last = clock;
      };
      const onLeave = () => {
        riffle.on = 0;
        riffle.target = SHEETS;
      };

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        count.textContent = String(SHEETS);
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        gsap
          .timeline({ delay: 0.1 })
          .to(words, {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.3);
      });

      void Promise.all([
        document.fonts.load(`400 58px ${fonts.serif}`),
        document.fonts.load(`italic 400 26px ${fonts.serif}`),
        document.fonts.load(`500 19px ${fonts.mono}`),
      ]).then(() => {
        if (!alive) return;
        scene = createPileScene({
          canvas,
          copy,
          fonts,
          colors: {
            ground: token("--pile-ground"),
            light: token("--lamp"),
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
          el.addEventListener("pointerleave", onLeave);
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
        el.removeEventListener("pointerleave", onLeave);
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
        <p className={styles.figure} data-chrome>
          <span className={styles.count} data-count>
            0
          </span>
          <span className={styles.label}>{tp("label")}</span>
        </p>
        <p className={styles.riffle} aria-hidden="true">
          {tp("sheet")} <span data-sheet>300</span> / 300
        </p>
        <p className={styles.hint} data-chrome>
          {tp("hint")}
        </p>
      </div>
    </section>
  );
}
