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

import { FIELD_IMAGES } from "../imagery";
import { geistMono, newsreader } from "../study-fonts";
import styles from "./hero-index.module.css";

/*
  Hero study "index" (an editorial index of what the firm covers).

  On paper: the headline, the brief's sub-line and both calls to action, then the five fields as a
  large index, one row each with its line from the brief. Hovering a row opens its image in a frame
  that trails the cursor; left alone, the index walks through the fields by itself with the frame
  parked at the right. Reduced motion: the first field lit, its image parked, no walking.
*/

const STEP = 3.2;

export function HeroIndex() {
  const t = useTranslations("hero");
  const fields = useMessages().heroStudies.dossier.fields;
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      const safe = contextSafe;
      if (!el || !safe) return;
      const q = gsap.utils.selector(el);
      const [frame] = q<HTMLElement>("[data-preview]");
      const [list] = q<HTMLElement>("[data-list]");
      if (!frame || !list) return;
      const rows = q<HTMLElement>("[data-row]");
      const shots = q<HTMLElement>("[data-shot]");
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const reduced = window.matchMedia(REDUCED_MOTION).matches;

      let current = -1;
      const select = (i: number) => {
        if (i === current) return;
        current = i;
        rows.forEach((row, k) => (row.dataset.active = k === i ? "true" : "false"));
        shots.forEach((shot, k) => {
          gsap.to(shot, {
            clipPath: k === i ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)",
            duration: reduced ? 0 : 0.7,
            ease: EASE.inOut,
            overwrite: true,
          });
        });
      };

      // Where the frame rests when nobody is pointing at the list.
      const park = () => {
        const host = el.getBoundingClientRect();
        const r = list.getBoundingClientRect();
        return {
          x: r.right - host.left - frame.offsetWidth,
          y: r.top - host.top - frame.offsetHeight - 28,
        };
      };
      const fx = gsap.quickTo(frame, "x", { duration: 0.6, ease: EASE.out });
      const fy = gsap.quickTo(frame, "y", { duration: 0.6, ease: EASE.out });
      const tilt = gsap.quickTo(frame, "rotation", { duration: 0.8, ease: EASE.out });
      let pointing = false;
      let lastX = 0;

      const onMove = safe((e: PointerEvent) => {
        const host = el.getBoundingClientRect();
        const x = e.clientX - host.left + 28;
        const y = e.clientY - host.top - frame.offsetHeight / 2;
        fx(Math.min(host.width - frame.offsetWidth - 12, x));
        fy(y);
        tilt(gsap.utils.clamp(-5, 5, (e.clientX - lastX) * 0.4));
        lastX = e.clientX;
      });
      const onEnterRow = safe((e: PointerEvent) => {
        pointing = true;
        select(Number((e.currentTarget as HTMLElement).dataset.row));
      });
      const onLeaveList = safe(() => {
        pointing = false;
        const p = park();
        fx(p.x);
        fy(p.y);
        tilt(0);
      });

      let walk: gsap.core.Tween | null = null;
      const step = safe(() => {
        if (!pointing) select((current + 1) % fields.length);
        walk = gsap.delayedCall(STEP, step);
      });

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 12 });
        gsap.set(rows, { autoAlpha: 0, y: 24 });
        gsap
          .timeline({ delay: 0.15 })
          .to(words, {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(
            chrome,
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.08, ease: EASE.soft },
            0.4,
          )
          .to(
            rows,
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.07, ease: EASE.out },
            0.6,
          );
      });

      gsap.set(shots, { clipPath: "inset(0% 0% 100% 0%)" });
      const p = park();
      gsap.set(frame, { x: p.x, y: p.y });
      select(0);
      if (!reduced) {
        walk = gsap.delayedCall(STEP, step);
        el.addEventListener("pointermove", onMove);
        rows.forEach((row) => row.addEventListener("pointerenter", onEnterRow));
        list.addEventListener("pointerleave", onLeaveList);
      }
      const resize = new ResizeObserver(() => {
        if (pointing) return;
        const r = park();
        gsap.set(frame, { x: r.x, y: r.y });
      });
      resize.observe(el);

      return () => {
        walk?.kill();
        resize.disconnect();
        el.removeEventListener("pointermove", onMove);
        rows.forEach((row) => row.removeEventListener("pointerenter", onEnterRow));
        list.removeEventListener("pointerleave", onLeaveList);
        mm.revert();
      };
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
          <div className={styles.aside}>
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
        </div>

        <ol className={styles.list} data-list>
          {fields.map((field, i) => (
            <li key={field.n} className={styles.row} data-row={i} data-active="false">
              <span className={styles.number}>{field.n}</span>
              <span className={styles.title}>{field.title}</span>
              <span className={styles.body}>{field.body}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.preview} data-preview aria-hidden="true">
        {FIELD_IMAGES.map((image, i) => (
          <div key={i} className={styles.shot} data-shot>
            <Image
              src={image}
              alt=""
              fill
              sizes="420px"
              placeholder="blur"
              className={styles.image}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
