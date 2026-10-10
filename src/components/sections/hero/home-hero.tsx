"use client";

import { useTranslations } from "next-intl";
import { useId, useRef } from "react";

import { Words } from "@/components/motion/words";
import { useMediaQuery } from "@/hooks/use-media-query";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { armWords } from "@/lib/motion/words";
import {
  DURATION,
  EASE,
  MOBILE_QUERY,
  MOTION_OK,
  REDUCED_MOTION,
  STAGGER,
} from "@/lib/motion/tokens";

import styles from "./home-hero.module.css";
import { HeroStage } from "./hero-stage";
import { measureAnchors } from "./anchors";
import { DEFAULT_ANCHORS, DESKTOP_VIEWBOX, MOBILE_VIEWBOX, SIGNATURE } from "./signature-paths";

/*
  The homepage hero, the Figma composition as drawn: one peach line leaves the full stop of the
  first title, loops down to the left, writes "ag impact partners", and sweeps back to land on the
  first letter of the second title. A terracotta pen dot travels the whole way.
*/
export function HomeHero() {
  const t = useTranslations("hero");
  const root = useRef<HTMLElement>(null);
  const mobile = useMediaQuery(MOBILE_QUERY);
  const clipId = useId();
  const { script } = SIGNATURE;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const words1 = q<HTMLElement>('[data-title="1"] .word');
      const words2 = q<HTMLElement>('[data-title="2"] .word');
      const [lead] = q<SVGPathElement>('[data-stroke="lead"]');
      const [baseline] = q<SVGPathElement>('[data-stroke="baseline"]');
      const [outro] = q<SVGPathElement>('[data-stroke="outro"]');
      const [wipe] = q<SVGRectElement>("[data-wipe]");
      const [pen] = q<SVGCircleElement>("[data-pen]");
      if (!lead || !baseline || !outro || !wipe || !pen) return;

      // Fit the lead-in and the outro to the rendered headline (the copy differs per locale).
      let drawing = false;
      const fit = () => {
        const anchors = mobile ? DEFAULT_ANCHORS : measureAnchors(el);
        lead.setAttribute("d", SIGNATURE.leadIn(anchors.start));
        outro.setAttribute("d", SIGNATURE.outro(anchors.end));
        if (!drawing) gsap.set([lead, outro], { drawSVG: "0%" });
      };
      fit();
      // Re-measure once the webfont is in, in case the first layout used a fallback face.
      document.fonts.ready.then(() => {
        if (!drawing) fit();
      });

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        drawing = true;
        gsap.set([lead, outro], { drawSVG: "0% 100%" });
        gsap.set(pen, { autoAlpha: 0 });
        el.dataset.state = "ready";
      });

      mm.add(MOTION_OK, () => {
        armWords(el, [...words1, ...words2]);
        gsap.set([lead, outro], { drawSVG: "0%" });
        gsap.set(wipe, { attr: { width: 0 } });
        gsap.set(pen, { autoAlpha: 0, transformOrigin: "50% 50%" });

        const follow = (path: SVGPathElement) => ({
          motionPath: { path, align: path, alignOrigin: [0.5, 0.5] as [number, number] },
        });

        gsap
          .timeline({ defaults: { ease: EASE.draw } })
          .to(
            words1,
            { yPercent: 0, duration: DURATION.words, stagger: STAGGER.words, ease: EASE.words },
            0.25,
          )
          .add(() => {
            drawing = true;
          }, 1.0)
          .set(pen, { autoAlpha: 1 }, 1.0)
          .to(lead, { drawSVG: "0% 100%", duration: 0.9 }, 1.0)
          .to(pen, { ...follow(lead), duration: 0.9 }, 1.0)
          .to(wipe, { attr: { width: script.clip.w }, duration: 1.4, ease: "power1.inOut" }, ">")
          .to(pen, { ...follow(baseline), duration: 1.4, ease: "power1.inOut" }, "<")
          .to(outro, { drawSVG: "0% 100%", duration: 1.1 }, ">")
          .to(pen, { ...follow(outro), duration: 1.1 }, "<")
          .to(pen, { scale: 0, autoAlpha: 0, duration: 0.35, ease: EASE.soft }, ">-0.05")
          .to(
            words2,
            { yPercent: 0, duration: DURATION.words, stagger: 0.06, ease: EASE.words },
            "<-0.35",
          );
      });

      return () => mm.revert();
    },
    { scope: root, dependencies: [mobile], revertOnUpdate: true },
  );

  return (
    <HeroStage
      ref={root}
      className={styles.root}
      title1={<Words text={t("title1")} />}
      title2={<Words text={t("title2")} />}
      art={
        <svg
          viewBox={mobile ? MOBILE_VIEWBOX : DESKTOP_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className={styles.svg}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                data-wipe
                x={script.clip.x}
                y={script.clip.y}
                width={script.clip.w}
                height={script.clip.h}
              />
            </clipPath>
          </defs>
          <path
            data-stroke="lead"
            d={SIGNATURE.leadIn(DEFAULT_ANCHORS.start)}
            className={styles.stroke}
          />
          <g clipPath={`url(#${clipId})`}>
            <text
              x={script.x}
              y={script.y}
              fontSize={script.fontSize}
              textLength={script.width}
              lengthAdjust="spacingAndGlyphs"
              className={styles.script}
            >
              {t("signature")}
            </text>
          </g>
          <path data-stroke="baseline" d={SIGNATURE.baseline} className={styles.guide} />
          <path
            data-stroke="outro"
            d={SIGNATURE.outro(DEFAULT_ANCHORS.end)}
            className={styles.stroke}
          />
          <circle data-pen cx="0" cy="0" r="5.5" className={styles.pen} />
        </svg>
      }
    >
      <p className="sr-only">{t("signatureAlt")}</p>
    </HeroStage>
  );
}
