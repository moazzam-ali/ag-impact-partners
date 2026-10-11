"use client";

import Image from "next/image";
import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { SCENES } from "../imagery";
import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-editorial.module.css";

/*
  Hero study "editorial" (a magazine cover for a senior firm).

  On paper, an asymmetric composition: the headline, the brief's sub-line and both calls to action
  on the left; on the right a tall picture of the roofs of Paris, with a smaller one of a hand
  signing laid over its corner; along the bottom the three approved figures, verbatim. The pictures
  open upwards on load and drift a little with the cursor and the scroll. Reduced motion: still.
*/

export function HeroEditorial() {
  const t = useTranslations("hero");
  const facts = useMessages().heroStudies.confidentiel.facts;
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      const safe = contextSafe;
      if (!el || !safe) return;
      const q = gsap.utils.selector(el);
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const [main] = q<HTMLElement>('[data-plate="main"]');
      const [inset] = q<HTMLElement>('[data-plate="inset"]');
      const figures = q<HTMLElement>("[data-figure]");
      if (!main || !inset) return;
      const mainImg = main.querySelector("img");
      const insetImg = inset.querySelector("img");

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 12 });
        gsap.set(figures, { autoAlpha: 0, y: 16 });
        gsap.set([main, inset], { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set([mainImg, insetImg], { scale: 1.18 });
        gsap
          .timeline({ delay: 0.15 })
          .to(main, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: EASE.inOut }, 0)
          .to(mainImg, { scale: 1.04, duration: 2.2, ease: EASE.out }, 0)
          .to(
            words,
            { yPercent: 0, duration: DURATION.words, stagger: STAGGER.words, ease: EASE.words },
            0.25,
          )
          .to(inset, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: EASE.inOut }, 0.75)
          .to(insetImg, { scale: 1, duration: 1.8, ease: EASE.out }, 0.75)
          .to(
            chrome,
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.08, ease: EASE.soft },
            0.6,
          )
          .to(
            figures,
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.1, ease: EASE.out },
            1.0,
          );

        // Depth: the inset drifts more than the main plate, with the cursor and the scroll.
        const mx = gsap.quickTo(main, "x", { duration: 1.2, ease: EASE.out });
        const my = gsap.quickTo(main, "y", { duration: 1.2, ease: EASE.out });
        const ix = gsap.quickTo(inset, "x", { duration: 1.2, ease: EASE.out });
        const iy = gsap.quickTo(inset, "y", { duration: 1.2, ease: EASE.out });
        const onMove = safe((e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          mx(nx * -10);
          my(ny * -8);
          ix(nx * 22);
          iy(ny * 18);
        });
        el.addEventListener("pointermove", onMove);
        gsap.to(mainImg, {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
        });
        return () => el.removeEventListener("pointermove", onMove);
      });
      return () => mm.revert();
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
      <div className={styles.frame}>
        <div className={styles.copy}>
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

        <div className={styles.plates} aria-hidden="true">
          <div className={styles.main} data-plate="main">
            <Image
              src={SCENES.paris}
              alt=""
              fill
              sizes="(max-width: 1023px) 100vw, 40vw"
              placeholder="blur"
              priority
              className={styles.image}
            />
          </div>
          <div className={styles.inset} data-plate="inset">
            <Image
              src={SCENES.signature}
              alt=""
              fill
              sizes="(max-width: 1023px) 40vw, 16vw"
              placeholder="blur"
              className={styles.image}
            />
          </div>
        </div>

        <dl className={styles.figures}>
          {facts.map((fact) => (
            <div key={fact.value} className={styles.figure} data-figure>
              <dt className={styles.value}>{fact.value}</dt>
              <dd className={styles.label}>{fact.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
