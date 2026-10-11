"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { geistMono } from "../study-fonts";
import styles from "./hero-confidentiel.module.css";

/*
  Hero study "confidentiel" (direction: Le Dossier, discretion as the proof).

  A dark file: the headline, then the firm's approved figures, each blacked out as the page
  loads. The cursor is an ultraviolet lamp: under it the figures fluoresce through the redaction,
  and so does a watermark across the page. The clients row never gives anything away: under the
  lamp it only says "Confidentiel". Without a mouse the lamp wanders over the file on its own.

  Two identical layers: the printed file, and its ultraviolet twin masked to the lamp's circle.
*/

type Fact = { value: string; label: string };

export function HeroConfidentiel() {
  const t = useTranslations("hero");
  const tc = useTranslations("heroStudies.confidentiel");
  const copy = useMessages().heroStudies.confidentiel;
  const facts: Fact[] = [...copy.facts, copy.clients];
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [table] = q<HTMLElement>("[data-facts]");
      if (!table) return;
      const words = q<HTMLElement>("[data-title] .word");
      const bars = q<HTMLElement>('[data-layer="print"] [data-bar]');
      const chrome = q<HTMLElement>('[data-layer="print"] [data-chrome]');
      const [stamp] = q<HTMLElement>('[data-layer="print"] [data-stamp]');

      const lamp = { x: 0, y: 0, r: 150, on: 0 };
      const target = { x: 0, y: 0, active: false, last: -10 };
      let time = 0;
      let visible = true;

      const paint = () => {
        el.style.setProperty("--lx", `${lamp.x.toFixed(1)}px`);
        el.style.setProperty("--ly", `${lamp.y.toFixed(1)}px`);
        el.style.setProperty("--lr", `${(lamp.r * lamp.on).toFixed(1)}px`);
      };

      /** The lamp's own path over the figures, when no mouse is steering it. */
      const wander = (s: number) => {
        const hero = el.getBoundingClientRect();
        const r = table.getBoundingClientRect();
        return {
          x: r.left - hero.left + r.width * (0.3 + 0.28 * Math.sin(s * 0.42)),
          y: r.top - hero.top + r.height * (0.5 + 0.42 * Math.sin(s * 0.27 + 0.6)),
        };
      };

      const tick = (_t: number, deltaMs: number) => {
        if (!visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        time += dt;
        const steering = target.active && time - target.last < 5;
        const goal = steering ? target : wander(time);
        const k = 1 - Math.exp(-(steering ? 11 : 2.4) * dt);
        lamp.x += (goal.x - lamp.x) * k;
        lamp.y += (goal.y - lamp.y) * k;
        paint();
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        target.x = e.clientX - r.left;
        target.y = e.clientY - r.top;
        target.active = true;
        target.last = time;
      };
      const onDown = (e: PointerEvent) => {
        // Touch: a tap moves the lamp there for a few seconds.
        const r = el.getBoundingClientRect();
        target.x = e.clientX - r.left;
        target.y = e.clientY - r.top;
        target.active = true;
        target.last = time;
      };
      const onLeave = () => {
        target.active = false;
      };

      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        const start = wander(0);
        Object.assign(lamp, { x: start.x, y: start.y, on: 1 });
        paint();
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(bars, { scaleX: 0 });
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        if (stamp) gsap.set(stamp, { autoAlpha: 0, scale: 1.5, rotate: -16 });
        const start = wander(0);
        Object.assign(lamp, { x: start.x, y: start.y });
        paint();

        const tl = gsap.timeline({ delay: 0.15 });
        tl.to(words, {
          yPercent: 0,
          duration: DURATION.words,
          stagger: STAGGER.words,
          ease: EASE.words,
        })
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.4)
          // Each figure is blacked out, one after the other.
          .to(bars, { scaleX: 1, duration: 0.55, ease: EASE.inOut, stagger: 0.14 }, 0.6);
        if (stamp) {
          tl.to(stamp, { autoAlpha: 1, scale: 1, rotate: -7, duration: 0.45, ease: EASE.pop }, 1.3);
        }
        tl.to(lamp, { on: 1, duration: 0.8, ease: EASE.soft }, 1.6);

        gsap.ticker.add(tick);
        io.observe(el);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          gsap.ticker.remove(tick);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerdown", onDown);
          el.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => {
        io.disconnect();
        mm.revert();
      };
    },
    { scope: root },
  );

  const file = (uv: boolean) => (
    <div
      className={cn(styles.layer, uv ? styles.uv : styles.print)}
      data-layer={uv ? "uv" : "print"}
      aria-hidden={uv || undefined}
    >
      <div className={styles.sheet}>
        <div className={styles.head} data-chrome>
          <span>
            {tc("dossier")} · {t("eyebrow")}
          </span>
          <span className={styles.stamp} data-stamp>
            {tc("stamp")}
          </span>
        </div>
        {/* Same markup in both layers, so they line up exactly; only the first is the h1. */}
        {(() => {
          const Heading = uv ? "p" : "h1";
          return (
            <Heading className={styles.headline} data-title={uv ? undefined : ""}>
              <span className={styles.line}>
                <Words text={t("title1")} />
              </span>{" "}
              <span className={styles.line}>
                <Words text={t("title2")} />
              </span>
            </Heading>
          );
        })()}
        <dl className={styles.facts} data-facts={uv ? undefined : ""}>
          {facts.map((fact, i) => (
            <div
              key={fact.value}
              className={cn(styles.row, i === facts.length - 1 && styles.clients)}
            >
              <dt className={styles.label}>{fact.label}</dt>
              <dd className={styles.value}>
                <span className={styles.text}>{fact.value}</span>
                <span className={styles.bar} data-bar aria-hidden="true" />
              </dd>
            </div>
          ))}
        </dl>
        <p className={styles.hint} data-chrome>
          {tc("hint")}
        </p>
      </div>
      {uv ? (
        <div className={styles.watermark} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>
              {tc("stamp")} · {tc("stamp")} · {tc("stamp")} · {tc("stamp")}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section
      ref={root}
      className={cn(styles.hero, geistMono.variable)}
      data-theme="dark"
      data-state="pending"
    >
      {file(false)}
      {file(true)}
      <div className={styles.lamp} aria-hidden="true" />
    </section>
  );
}
