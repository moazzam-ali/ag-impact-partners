"use client";

import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Words } from "@/components/motion/words";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { FIELD_IMAGES } from "../imagery";
import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-cadre.module.css";

/*
  Hero study "cadre" (plein cadre: image-led intro).

  Full-bleed images of the five fields take turns behind the headline, each wiping in from the
  right behind a peach hairline while the last one holds, with a slow push-in. Bottom right, the
  five fields in order are a timeline: the current one is lit, says what it covers, and fills its
  line; any of them can be chosen. Bottom left: headline, the brief's sub-line, both calls to
  action. Reduced motion: the first image, still; the fields can still be chosen.
*/

const HOLD = 5.5;

export function HeroCadre() {
  const t = useTranslations("hero");
  const fields = useMessages().heroStudies.dossier.fields;
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);

  const show = (next: number) => {
    if (next === active) return;
    setPrevious(active);
    setActive(next);
  };

  useEffect(() => {
    if (!auto || window.matchMedia(REDUCED_MOTION).matches) return;
    const timer = window.setTimeout(() => {
      setPrevious(active);
      setActive((active + 1) % FIELD_IMAGES.length);
    }, HOLD * 1000);
    return () => window.clearTimeout(timer);
  }, [active, auto]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 12 });
        gsap
          .timeline({ delay: 0.2 })
          .to(words, {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(
            chrome,
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.08, ease: EASE.soft },
            0.45,
          );
      });
      return () => mm.revert();
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
      <div className={styles.slides} aria-hidden="true">
        {FIELD_IMAGES.map((image, i) => (
          <div
            key={i}
            className={styles.slide}
            data-slide={i === active ? "active" : i === previous ? "previous" : "idle"}
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="100vw"
              placeholder="blur"
              priority={i === 0}
              loading={i === 0 ? undefined : "eager"}
              className={styles.image}
            />
          </div>
        ))}
        <span key={`wipe-${active}`} className={styles.wipe} data-run={previous !== null} />
        <div className={styles.scrim} />
      </div>

      <div className={styles.frame}>
        <div className={styles.intro}>
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
          <p className={styles.sub} data-chrome>
            {t("sub")}
          </p>
          <div className={styles.actions} data-chrome>
            <ButtonLink href="/contact">{t("primary")}</ButtonLink>
            <ButtonLink href="/expertise" variant="ghost">
              {t("secondary")}
            </ButtonLink>
          </div>
        </div>

        <ol
          className={styles.fields}
          data-chrome
          onMouseEnter={() => setAuto(false)}
          onMouseLeave={() => setAuto(true)}
        >
          {fields.map((field, i) => (
            <li key={field.n} className={styles.field} data-active={i === active || undefined}>
              <button
                type="button"
                className={styles.fieldButton}
                onClick={() => show(i)}
                aria-pressed={i === active}
              >
                <span className={styles.number}>{field.n}</span>
                <span className={styles.title}>{field.title}</span>
              </button>
              <span className={styles.track} aria-hidden="true">
                <span
                  key={`${i}-${active}`}
                  className={styles.fill}
                  data-run={(i === active && auto) || undefined}
                />
              </span>
              <p className={styles.body}>{field.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
