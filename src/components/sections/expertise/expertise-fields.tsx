"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { FieldMark } from "@/components/sections/hero/pile2/fil-domaines";
import { ButtonLink } from "@/components/ui/button-link";
import { afterCurtain } from "@/lib/motion/curtain";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import styles from "./expertise-fields.module.css";

/*
  A simple Expertise page, enough to show page transitions: the brief's line on the five fields
  as the heading, then the fields in their fixed order with their lines from the brief. Its intro
  (words rising, rules drawn, rows in) waits for the curtain, so it plays as the page is revealed.
*/
export function ExpertiseFields() {
  const t = useTranslations();
  const studies = useMessages().heroStudies;
  const [heading = "", ...rest] = studies.dossier.intro.split(/(?<=\.)\s+/);
  const lede = rest.join(" ");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        armWords(el, q("[data-title] .word"));
        gsap.set(q("[data-in]"), { autoAlpha: 0, y: 16 });
        gsap.set(q("[data-rule]"), { scaleX: 0 });
        gsap.set(q("[data-row]"), { autoAlpha: 0, y: 28 });
        const intro = gsap
          .timeline({ paused: true, delay: 0.05 })
          .to(q("[data-title] .word"), {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(
            q("[data-in]"),
            { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft, stagger: 0.08 },
            0.3,
          )
          .to(q("[data-rule]"), { scaleX: 1, duration: 1.1, ease: EASE.inOut, stagger: 0.08 }, 0.45)
          .to(
            q("[data-row]"),
            { autoAlpha: 1, y: 0, duration: DURATION.slow, ease: EASE.out, stagger: 0.08 },
            0.55,
          );
        return afterCurtain(() => intro.play());
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.page} data-state="pending">
      <header className={styles.head}>
        <p className={styles.eyebrow} data-in>
          {t("nav.expertise")}
        </p>
        <h1 className={styles.title} data-title>
          <Words text={heading} />
        </h1>
        <div className={styles.side} data-in>
          <p className={styles.lede}>{lede}</p>
          <ButtonLink href="/contact">{t("hero.primary")}</ButtonLink>
        </div>
      </header>

      <ol className={styles.fields}>
        {studies.pile2.fields.map((field, i) => (
          <li key={field.n} className={styles.field}>
            <span className={styles.rule} data-rule />
            <div className={styles.row} data-row>
              <FieldMark index={i} className={styles.mark} />
              <h2 className={styles.name}>{field.title}</h2>
              <p className={styles.body}>{field.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
