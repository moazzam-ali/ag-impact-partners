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
import styles from "./hero-table.module.css";
import { createTableScene, STILL_AT } from "./table-scene";

/*
  Hero study "table" (direction: the negotiation itself, in 3D).

  Seen from above a long walnut table: our hand and pen near the camera, theirs across the table.
  One contract crosses back and forth (spinning to face each side), collecting a struck term and
  initials from each party, then comes to the middle: we sign, it turns, they sign, it slides away,
  the next one comes in. The headline is the story it tells. Reduced motion: both signatures down.
*/

const HAND_URL = "/models/hand-right.glb";
const stripMarks = (body: string) =>
  body.replace(/<k>(.*?)<\/k>/g, "$1").replace(/<e>(.*?)\|.*?<\/e>/g, "$1");

export function HeroTable() {
  const t = useTranslations("hero");
  const studies = useMessages().heroStudies;
  const articles = studies.redline.contract.articles;
  const copy: DocCopy[] = studies.signataire.docs.map((title, i) => ({
    title,
    ref: studies.signataire.ref,
    between: [studies.signataire.between[0] ?? "", studies.signataire.between[1] ?? ""],
    clauses: [0, 1, 2].map((k) => {
      const a = articles[(i * 3 + k) % articles.length]!;
      return { title: a.title, body: stripMarks(a.body) };
    }),
    place: studies.signataire.place,
    parties: [studies.signataire.parties[0] ?? "", studies.signataire.parties[1] ?? ""],
  }));
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
      const reduced = window.matchMedia(REDUCED_MOTION).matches;
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const fonts = { serif: token("--font-newsreader"), mono: token("--font-mono") };
      let alive = true;
      let visible = true;
      let clock = 0;
      let scene: Awaited<ReturnType<typeof createTableScene>> | null = null;

      const fit = () => {
        scene?.resize(canvas.clientWidth, canvas.clientHeight);
        if (reduced) scene?.frame(STILL_AT);
      };
      const tick = (_t: number, deltaMs: number) => {
        if (!scene || !visible) return;
        clock += Math.min(0.05, deltaMs / 1000);
        scene.frame(clock);
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
      ])
        .then(() =>
          createTableScene({
            canvas,
            copy,
            fonts,
            handUrl: HAND_URL,
            colors: {
              wood: token("--walnut"),
              leather: token("--leather"),
              floor: token("--room"),
              light: token("--lamp"),
              skin: token("--plaster"),
              lacquer: token("--lacquer"),
              metal: token("--accent"),
              sleeve: token("--sleeve"),
              sleeveThem: token("--sleeve-them"),
              cuff: token("--cuff"),
              ink: token("--sign-ink"),
              inkThem: token("--pen"),
              paper: token("--paper"),
              print: token("--print"),
              soft: token("--print-soft"),
              rule: token("--print-rule"),
            },
          }),
        )
        .then((created) => {
          if (!alive) return created.dispose();
          scene = created;
          fit();
          el.dataset.scene = "ready";
          if (!reduced) gsap.ticker.add(tick);
        })
        .catch((error: unknown) => console.error("Table scene:", error));

      const resize = new ResizeObserver(fit);
      resize.observe(canvas);
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });
      io.observe(el);
      el.addEventListener("pointermove", onMove);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        resize.disconnect();
        io.disconnect();
        el.removeEventListener("pointermove", onMove);
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
