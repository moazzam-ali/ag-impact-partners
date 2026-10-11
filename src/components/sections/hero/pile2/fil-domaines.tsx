"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK } from "@/lib/motion/tokens";

import { type Field } from "./documents";
import styles from "./fil-domaines.module.css";
import { Glyph } from "./glyphs";

/*
  "Le fil des domaines": the five fields on one running thread. The thread is the baseline the
  names sit on; between them it rises into a drawing of the field and comes back down, and the
  field's own lines (from the brief) stand beside it in small capitals. It is drawn in from the left
  on load, then runs on: faster with the scroll (backwards when scrolling up), almost still under
  the pointer. The field whose document is on top of the pile is marked.
*/

type Props = { fields: Field[]; label: string; active: number; className?: string };

export function FilDomaines({ fields, label, active, className }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const track = el?.querySelector<HTMLElement>("[data-track]");
      const run = el?.querySelector<HTMLElement>("[data-run]");
      if (!el || !track || !run) return;

      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        let loop: gsap.core.Tween | null = null;
        const build = () => {
          const progress = loop?.progress() ?? 0;
          loop?.kill();
          const width = run.offsetWidth;
          loop = gsap.fromTo(
            track,
            { x: 0 },
            { x: -width, duration: width / 44, ease: "none", repeat: -1 },
          );
          // Far into the repeats, so a reversed run (scrolling up) has room to go backwards.
          loop.totalTime(loop.duration() * (60 + progress));
        };
        build();
        gsap.fromTo(
          el,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 1.9, ease: "power2.inOut", delay: 0.45 },
        );

        let boost = 0;
        let calm = 1;
        let speed = 1;
        const tick = () => {
          boost *= 0.93;
          speed += (calm * (1 + boost) - speed) * 0.08;
          loop?.timeScale(speed);
        };
        gsap.ticker.add(tick);
        const enter = () => (calm = 0.16);
        const leave = () => (calm = 1);
        el.addEventListener("pointerenter", enter);
        el.addEventListener("pointerleave", leave);
        ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            boost = gsap.utils.clamp(-5, 5, self.getVelocity() / 280);
          },
        });
        const resize = new ResizeObserver(build);
        resize.observe(run);

        return () => {
          gsap.ticker.remove(tick);
          el.removeEventListener("pointerenter", enter);
          el.removeEventListener("pointerleave", leave);
          resize.disconnect();
          loop?.kill();
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const items = (copy: number) =>
    fields.map((field, i) => (
      <li
        key={`${copy}-${field.n}`}
        className={styles.item}
        data-current={i === active ? "" : undefined}
      >
        <span className={styles.name}>
          <span className={styles.n}>{field.n}</span>
          {field.title}
        </span>
        <span className={styles.glyph}>
          <Glyph index={i} />
        </span>
        <span className={styles.lines}>
          {field.items.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
        <span className={styles.gap} />
      </li>
    ));

  return (
    <div ref={root} className={cn(styles.fil, className)} data-fil>
      <p className={styles.label}>{label}</p>
      <div className={styles.track} data-track>
        <ul className={styles.run} data-run>
          {items(0)}
        </ul>
        <ul className={styles.run} aria-hidden="true">
          {items(1)}
        </ul>
      </div>
    </div>
  );
}
