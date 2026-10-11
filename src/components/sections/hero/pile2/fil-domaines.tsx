"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";
import { afterCurtain } from "@/lib/motion/curtain";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { MOTION_OK } from "@/lib/motion/tokens";

import { type Field } from "./documents";
import styles from "./fil-domaines.module.css";
import { FieldIcon } from "./icons";

/*
  "Le fil des domaines": a slim running line of the five fields, each a small card with its line
  icon (one moving part in ink) and its name. Fixed label on the left, the line runs on to the right: drawn in from
  the left on load, faster with the scroll (backwards when scrolling up), almost still under the
  pointer. The field whose document is on top of the pile is marked.
*/

/** A field's icon at the size and colours of the thread; also used beside the callout's title. */
export function FieldMark({ index, className }: { index: number; className?: string }) {
  return (
    <span className={cn(styles.icon, className)}>
      <FieldIcon index={index} />
    </span>
  );
}

type Props = { fields: Field[]; label: string; active: number; className?: string };

export function FilDomaines({ fields, label, active, className }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      const view = el?.querySelector<HTMLElement>("[data-window]");
      const track = el?.querySelector<HTMLElement>("[data-track]");
      const run = el?.querySelector<HTMLElement>("[data-run]");
      if (!el || !view || !track || !run) return;

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
            { x: -width, duration: width / 32, ease: "none", repeat: -1 },
          );
          // Far into the repeats, so a reversed run (scrolling up) has room to go backwards.
          loop.totalTime(loop.duration() * (60 + progress));
        };
        build();
        const reveal = gsap.fromTo(
          view,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 1.9,
            ease: "power2.inOut",
            delay: 0.45,
            paused: true,
          },
        );
        const stop = afterCurtain(() => reveal.play());

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
          stop();
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
        <FieldMark index={i} />
        <span className={styles.title}>{field.title}</span>
      </li>
    ));

  return (
    <div ref={root} className={cn(styles.fil, className)} data-fil>
      <p className={styles.label}>{label}</p>
      <div className={styles.window} data-window>
        <div className={styles.track} data-track>
          {/* Three runs: the window can be wider than one, and the loop needs one more beyond it. */}
          {[0, 1, 2].map((copy) => (
            <ul
              key={copy}
              className={styles.run}
              data-run={copy === 0 ? "" : undefined}
              aria-hidden={copy > 0 || undefined}
            >
              {items(copy)}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
