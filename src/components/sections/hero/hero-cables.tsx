"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { LightCables } from "@/components/motion/light-cables";
import { Words } from "@/components/motion/words";
import { useMediaQuery } from "@/hooks/use-media-query";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import {
  DURATION,
  EASE,
  MOBILE_QUERY,
  MOTION_OK,
  REDUCED_MOTION,
  STAGGER,
} from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import styles from "./hero-cables.module.css";

/*
  Hero variant "cables". The headline's two lines sit top-left and bottom-right of the frame, as in the
  Figma; between them the light cables flow down the band and bend towards the pointer. Intro: the
  cables fade up, then each line rises word by word.
*/
export function HeroCables() {
  const t = useTranslations("hero");
  const root = useRef<HTMLElement>(null);
  const mobile = useMediaQuery(MOBILE_QUERY);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const words1 = q<HTMLElement>('[data-title="1"] .word');
      const words2 = q<HTMLElement>('[data-title="2"] .word');
      const [visual] = q<HTMLElement>("[data-visual]");

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });

      mm.add(MOTION_OK, () => {
        armWords(el, [...words1, ...words2]);
        if (visual) gsap.set(visual, { autoAlpha: 0 });

        const tl = gsap.timeline();
        if (visual) tl.to(visual, { autoAlpha: 1, duration: 1.8, ease: EASE.soft }, 0.2);
        tl.to(
          words1,
          { yPercent: 0, duration: DURATION.words, stagger: STAGGER.words, ease: EASE.words },
          0.35,
        ).to(
          words2,
          { yPercent: 0, duration: DURATION.words, stagger: 0.06, ease: EASE.words },
          1.0,
        );
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.hero} data-theme="dark" data-state="pending">
      <div className={styles.visual} data-visual aria-hidden="true">
        {/*
          The tip sits at the top, right of the first line (centred on phones); a standing curve bows
          the bundle left through the middle and back right at the bottom. Hover adds its own pull on
          top. The tip is shown early (feedIn) but kept from blowing out (originGlow).
        */}
        <LightCables
          className={styles.cables}
          positionX={mobile ? -20 : 30}
          positionY={-6}
          bundle={{ widthStart: 25 }}
          curve={{ x: mobile ? 0.4 : 0.33, y: 0.66, amount: 100, width: 140 }}
          feedIn={0.08}
          feedOut={0.8}
          originGlow={0.25}
        />
      </div>
      <div className={styles.frame}>
        <h1 className={styles.headline}>
          <span className={styles.title1} data-title="1">
            <Words text={t("title1")} />
          </span>{" "}
          <span className={styles.title2} data-title="2">
            <Words text={t("title2")} />
          </span>
        </h1>
      </div>
    </section>
  );
}
