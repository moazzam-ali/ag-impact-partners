"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { geistMono, newsreader } from "../study-fonts";
import { type DocCopy } from "./documents";
import styles from "./hero-signataire.module.css";
import { type Grip, WRITING_GRIP } from "./hand";
import { createSignataireScene, STILL_AT } from "./scene";

/*
  Hero study "signataire" (direction: Le Dossier, executed in 3D).

  A sculpted hand holding a fountain pen works through contracts on a dark desk: each page slides in,
  the hand strikes a phrase, initials it in the margin, signs, underlines and lifts away; the signed
  page slides off and the next comes in. The headline stays on the left throughout. The camera
  drifts a little with the cursor. Reduced motion: one still, signed.
*/

const HAND_URL = "/models/hand-right.glb";
const stripMarks = (body: string) =>
  body.replace(/<k>(.*?)<\/k>/g, "$1").replace(/<e>(.*?)\|.*?<\/e>/g, "$1");

export function HeroSignataire() {
  const t = useTranslations("hero");
  const studies = useMessages().heroStudies;
  const root = useRef<HTMLElement>(null);

  // Each page gets its own title and three consecutive clauses of the shared contract.
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
      const params = new URLSearchParams(window.location.search);
      const debugGrip = params.has("grip");
      // Debug only: ?grip={json} overrides parts of the grip while it is being tuned.
      let grip: Grip | undefined;
      try {
        const raw = params.get("grip");
        if (raw) grip = { ...WRITING_GRIP, ...(JSON.parse(raw) as Partial<Grip>) };
      } catch {
        grip = undefined;
      }

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        gsap
          .timeline()
          .to(
            words,
            {
              yPercent: 0,
              duration: DURATION.words,
              stagger: STAGGER.words,
              ease: EASE.words,
            },
            0.15,
          )
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.6);
      });

      // ---- The 3D scene ----------------------------------------------------------------------
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const fonts = { serif: token("--font-newsreader"), mono: token("--font-mono") };
      let alive = true;
      let visible = true;
      let clock = 0;
      let scene: Awaited<ReturnType<typeof createSignataireScene>> | null = null;

      const fit = () => scene?.resize(canvas.clientWidth, canvas.clientHeight);
      const tick = (_time: number, deltaMs: number) => {
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

      void Promise.all([
        document.fonts.load(`400 58px ${fonts.serif}`),
        document.fonts.load(`italic 400 26px ${fonts.serif}`),
        document.fonts.load(`500 19px ${fonts.mono}`),
      ])
        .then(() =>
          createSignataireScene({
            canvas,
            copy,
            fonts,
            handUrl: HAND_URL,
            debugGrip,
            grip,
            colors: {
              desk: token("--desk"),
              light: token("--lamp"),
              skin: token("--plaster"),
              lacquer: token("--lacquer"),
              metal: token("--accent"),
              sleeve: token("--sleeve"),
              cuff: token("--cuff"),
              ink: token("--sign-ink"),
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
          if (reduced) scene.frame(STILL_AT);
          else gsap.ticker.add(tick);
          el.dataset.scene = "ready";
        })
        .catch((error: unknown) => console.error("Signataire scene:", error));

      const resize = new ResizeObserver(() => {
        fit();
        if (reduced) scene?.frame(STILL_AT);
      });
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
