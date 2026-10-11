"use client";

import { getImageProps } from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { type CSSProperties, useRef } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { FIELD_IMAGES } from "../imagery";
import { archivo, geistMono, newsreader } from "../study-fonts";
import styles from "./hero-fenetres.module.css";

/*
  Hero study "fenetres" (windows: the fields seen through the headline).

  On paper, "Nous négocions." set huge in heavy capitals, and through the letters the five fields'
  pictures, one after another. Below, the second line, the sub-line and the actions. The hero is
  pinned for a little over two screens: scrolling dives into the counter of the O until the
  picture fills the screen, and names its field. Reduced motion: the letters with the first
  picture, one screen tall.

  The visible capitals are the h1 itself (background-clip: text); four twins carry the other
  pictures and cross-fade over it.
*/

const HOLD = 4;

export function HeroFenetres() {
  const t = useTranslations("hero");
  const fields = useMessages().heroStudies.dossier.fields;
  const root = useRef<HTMLElement>(null);
  const backgrounds = FIELD_IMAGES.map(
    (image) => getImageProps({ src: image, alt: "", width: 1920, quality: 75 }).props.src,
  );
  const words = t("title1").split(" ");

  // The first word, with its O marked: the dive goes through that letter's counter.
  const type = (layer: number) =>
    words.map((word, w) => {
      const o = w === 0 ? word.toLocaleUpperCase().indexOf("O") : -1;
      return (
        <span key={`${word}-${w}`} className={styles.row}>
          {o >= 0 ? (
            <>
              {word.slice(0, o)}
              <span data-o={layer === 0 ? "" : undefined}>{word.slice(o, o + 1)}</span>
              {word.slice(o + 1)}
            </>
          ) : (
            word
          )}
        </span>
      );
    });

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [stage] = q<HTMLElement>("[data-stage]");
      const [o] = q<HTMLElement>("[data-o]");
      const [full] = q<HTMLElement>("[data-full]");
      const [below] = q<HTMLElement>("[data-below]");
      const [caption] = q<HTMLElement>("[data-caption]");
      if (!stage || !o || !full || !below || !caption) return;
      const twins = q<HTMLElement>("[data-twin]");
      const captions = q<HTMLElement>("[data-field]");

      let current = 0;
      const setFull = (i: number) => {
        full.style.backgroundImage = `url("${backgrounds[i] ?? ""}")`;
        captions.forEach((c, k) => (c.hidden = k !== i));
      };
      setFull(0);

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        el.dataset.state = "ready";
        gsap.set(twins, { autoAlpha: 0 });
        gsap.set(below, { autoAlpha: 0, y: 16 });
        gsap.set(stage, { yPercent: 8, autoAlpha: 0 });
        gsap
          .timeline({ delay: 0.15 })
          .to(stage, { yPercent: 0, autoAlpha: 1, duration: 1.4, ease: EASE.out }, 0)
          .to(below, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.7);

        // The pictures take turns inside the letters.
        const cycle = gsap.timeline({ repeat: -1, delay: HOLD });
        for (let k = 1; k <= twins.length; k++) {
          cycle
            .to(twins[k - 1]!, {
              autoAlpha: 1,
              duration: 1.2,
              ease: EASE.inOut,
              onStart: () => void (current = k),
            })
            .to({}, { duration: HOLD });
        }
        cycle
          .to(twins, {
            autoAlpha: 0,
            duration: 1.2,
            ease: EASE.inOut,
            onStart: () => void (current = 0),
          })
          .to({}, { duration: HOLD });

        // The dive: scale about the O's counter until the picture fills the screen.
        const origin = () => {
          const s = stage.getBoundingClientRect();
          const r = o.getBoundingClientRect();
          return `${r.left - s.left + r.width / 2}px ${r.top - s.top + r.height * 0.55}px`;
        };
        gsap.set(stage, { transformOrigin: origin() });
        const dive = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            onEnter: () => {
              cycle.pause();
              setFull(current);
            },
            onLeaveBack: () => {
              cycle.play();
            },
            onRefresh: () => gsap.set(stage, { transformOrigin: origin() }),
          },
        });
        dive
          .to(below, { autoAlpha: 0, y: -20, duration: 0.15, ease: "none" }, 0)
          .to(stage, { scale: 34, duration: 0.8, ease: "power2.in" }, 0.05)
          .to(full, { autoAlpha: 1, duration: 0.15, ease: "none" }, 0.72)
          .to(caption, { autoAlpha: 1, y: 0, duration: 0.15, ease: "none" }, 0.85);
        gsap.set([full, caption], { autoAlpha: 0 });
        gsap.set(caption, { y: 16 });
        return () => {
          cycle.kill();
          ScrollTrigger.refresh();
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const layer = (i: number): CSSProperties => ({
    backgroundImage: `url("${backgrounds[i] ?? ""}")`,
  });

  return (
    <section
      ref={root}
      className={cn(styles.hero, archivo.variable, newsreader.variable, geistMono.variable)}
      data-theme="light"
      data-state="pending"
    >
      <div className={styles.sticky}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <div className={styles.stage} data-stage>
          <h1
            className={styles.type}
            style={layer(0)}
            data-type
            aria-label={`${t("title1")} ${t("title2")}`}
          >
            {type(0)}
          </h1>
          {FIELD_IMAGES.slice(1).map((_, i) => (
            <p
              key={i}
              className={cn(styles.type, styles.twin)}
              style={layer(i + 1)}
              data-twin
              aria-hidden="true"
            >
              {type(i + 1)}
            </p>
          ))}
        </div>

        <div className={styles.below} data-below>
          <p className={styles.second}>{t("title2")}</p>
          <p className={styles.sub}>{t("sub")}</p>
          <div className={styles.actions}>
            <ButtonLink href="/contact">{t("primary")}</ButtonLink>
            <ButtonLink href="/expertise" variant="ghost">
              {t("secondary")}
            </ButtonLink>
          </div>
        </div>

        <div className={styles.full} data-full aria-hidden="true" />
        <div className={styles.caption} data-caption aria-hidden="true">
          {fields.map((field, i) => (
            <p key={field.n} data-field hidden={i !== 0}>
              <span className={styles.number}>{field.n}</span> {field.title}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
