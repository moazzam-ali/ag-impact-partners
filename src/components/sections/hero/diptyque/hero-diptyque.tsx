"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { SCENES } from "../imagery";
import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-diptyque.module.css";

/*
  Hero study "diptyque" (two sides of the table, in pictures).

  Two full-height pictures side by side: the empty boardroom under "Nous négocions.", the hand
  signing under "Jusqu'à la signature.". On load they come in from opposite edges and meet at a
  peach hairline, the motion system's opening "meet". The side under the cursor opens a little
  wider. Along the bottom, the brief's sub-line and both calls to action. Reduced motion: still,
  even.
*/

export function HeroDiptyque() {
  const t = useTranslations("hero");
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      const safe = contextSafe;
      if (!el || !safe) return;
      const q = gsap.utils.selector(el);
      const [left] = q<HTMLElement>('[data-panel="left"]');
      const [right] = q<HTMLElement>('[data-panel="right"]');
      const [seam] = q<HTMLElement>("[data-seam]");
      const titles = q<HTMLElement>("[data-half]");
      const chrome = q<HTMLElement>("[data-chrome]");
      if (!left || !right || !seam) return;
      const leftImg = left.querySelector<HTMLElement>("[data-pan]");
      const rightImg = right.querySelector<HTMLElement>("[data-pan]");

      const s = { split: 0.5, l: 1, r: 1 };
      const apply = () => {
        const sp = s.split;
        left.style.clipPath = `inset(0 ${((1 - sp * s.l) * 100).toFixed(3)}% 0 0)`;
        right.style.clipPath = `inset(0 0 0 ${((1 - (1 - sp) * s.r) * 100).toFixed(3)}%)`;
        el.style.setProperty("--split", sp.toFixed(4));
        if (leftImg) leftImg.style.transform = `translateX(${((sp - 0.5) * 8).toFixed(2)}%)`;
        if (rightImg) rightImg.style.transform = `translateX(${((sp - 0.5) * 8).toFixed(2)}%)`;
      };

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        apply();
      });
      mm.add(MOTION_OK, () => {
        el.dataset.state = "ready";
        s.l = 0;
        s.r = 0;
        apply();
        gsap.set(seam, { scaleY: 0 });
        gsap.set(titles, { yPercent: 110 });
        gsap.set(chrome, { autoAlpha: 0, y: 12 });
        gsap
          .timeline({ delay: 0.15, onUpdate: apply })
          .to(s, { l: 1, r: 1, duration: 1.5, ease: EASE.inOut }, 0)
          .to(seam, { scaleY: 1, duration: 0.9, ease: EASE.out }, 1.1)
          .to(
            titles,
            { yPercent: 0, duration: DURATION.words, stagger: 0.25, ease: EASE.words },
            0.9,
          )
          .to(
            chrome,
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.08, ease: EASE.soft },
            1.4,
          );

        const to = gsap.quickTo(s, "split", { duration: 1.1, ease: EASE.out, onUpdate: apply });
        const onMove = safe((e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          to(0.5 + (x < 0.5 ? 0.06 : -0.06));
        });
        const onLeave = safe(() => to(0.5));
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
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
      <div className={cn(styles.panel, styles.left)} data-panel="left" aria-hidden="true">
        <div className={styles.pan} data-pan>
          <Image
            src={SCENES.table}
            alt=""
            fill
            sizes="60vw"
            placeholder="blur"
            priority
            className={styles.image}
          />
        </div>
      </div>
      <div className={cn(styles.panel, styles.right)} data-panel="right" aria-hidden="true">
        <div className={styles.pan} data-pan>
          <Image
            src={SCENES.signature}
            alt=""
            fill
            sizes="60vw"
            placeholder="blur"
            priority
            className={styles.image}
          />
        </div>
      </div>
      <div className={styles.scrim} aria-hidden="true" />
      <span className={styles.seam} data-seam aria-hidden="true" />

      <h1 className={styles.headline}>
        <span className={cn(styles.half, styles.halfLeft)}>
          <span className={styles.mask}>
            <span className={styles.text} data-half>
              {t("title1")}
            </span>
          </span>
        </span>{" "}
        <span className={cn(styles.half, styles.halfRight)}>
          <span className={styles.mask}>
            <span className={styles.text} data-half>
              {t("title2")}
            </span>
          </span>
        </span>
      </h1>

      <div className={styles.band}>
        <div className={styles.lede} data-chrome>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <p className={styles.sub}>{t("sub")}</p>
        </div>
        <div className={styles.actions} data-chrome>
          <ButtonLink href="/contact">{t("primary")}</ButtonLink>
          <ButtonLink href="/expertise" variant="ghost">
            {t("secondary")}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
