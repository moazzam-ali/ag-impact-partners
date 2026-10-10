"use client";

import { useTranslations } from "next-intl";
import { useRef, type ReactNode } from "react";

import { Words } from "@/components/motion/words";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import styles from "./signature-shell.module.css";

/*
  Intro timing every signature variant follows: both headline lines rise first, and the signature
  starts while they are still moving (never after the signature finishes).
*/
export const SIGNATURE_INTRO = {
  /** Line 1 starts rising. */
  first: 0.15,
  /** Line 2 starts rising. */
  second: 0.45,
  /** The pen (or the variant's own intro) starts. */
  signature: 0.7,
} as const;

export type SignatureShellProps = {
  /** The signature: positioned by the variant inside a stage that fills the whole hero. */
  children: ReactNode;
  /** The palette the band uses. Dark by default, like the rest of the site. */
  theme?: "dark" | "light";
  /** Large = mega / d1 (as the cables variant). Medium = d1 / d2, for more room in the centre. */
  titleSize?: "large" | "medium";
  /**
   * When each headline line starts rising, in seconds after mount. `second: null` leaves line 2
   * masked for the variant to reveal itself (e.g. when a scroll-driven signature completes).
   */
  titleTimings?: { first: number; second: number | null };
  /** Interaction hint, bottom-left. */
  hint?: string;
  /** When the hint fades in, in seconds after mount. */
  hintAt?: number;
  className?: string;
};

/*
  The frame every signature variant shares: band, stage, headline, hint. A variant only builds the
  signature (and its interaction) and passes it as children. The shell owns the section's
  data-state: it starts "pending" (titles masked) and goes "ready" when the intro is armed. Children's
  layout effects run before the shell's, so a variant can hide its own start state behind
  [data-state="pending"] too.
*/
export function SignatureShell({
  children,
  theme = "dark",
  titleSize = "large",
  titleTimings = { first: SIGNATURE_INTRO.first, second: SIGNATURE_INTRO.second },
  hint,
  hintAt = 4,
  className,
}: SignatureShellProps) {
  const t = useTranslations("hero");
  const root = useRef<HTMLElement>(null);
  const { first, second } = titleTimings;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const words1 = q<HTMLElement>('[data-title="1"] .word');
      const words2 = q<HTMLElement>('[data-title="2"] .word');
      const [hintEl] = q<HTMLElement>("[data-hint]");

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        // Interactions are off under reduced motion, so their hint would mislead.
        if (hintEl) gsap.set(hintEl, { autoAlpha: 0 });
      });

      mm.add(MOTION_OK, () => {
        armWords(el, [...words1, ...words2]);
        if (hintEl) gsap.set(hintEl, { autoAlpha: 0, y: 8 });

        const tl = gsap.timeline();
        tl.to(
          words1,
          { yPercent: 0, duration: DURATION.words, stagger: STAGGER.words, ease: EASE.words },
          first,
        );
        if (second !== null) {
          tl.to(
            words2,
            { yPercent: 0, duration: DURATION.words, stagger: 0.06, ease: EASE.words },
            second,
          );
        }
        if (hintEl) {
          tl.to(hintEl, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, hintAt);
        }
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={cn(styles.hero, titleSize === "large" ? styles.large : styles.medium, className)}
      data-theme={theme}
      data-state="pending"
      aria-label={siteConfig.name}
    >
      <div className={styles.stage}>{children}</div>
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
      {hint ? (
        <p className={styles.hint} data-hint>
          {hint}
        </p>
      ) : null}
    </section>
  );
}
