"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { archivo } from "../study-fonts";
import styles from "./hero-rapport.module.css";
import { advance, type Advances, balanceRows, SAMPLES, weightFor, widthFor } from "./rapport-type";

/*
  Hero study "rapport" (direction: Rapport de force, type under pressure).

  One vertical line splits the band into two fields, peach and black: the two sides of the table.
  The headline is set as a poster across both, inverted at the line. Drag the line and the side that
  gains ground stretches its letters wide (Archivo's width axis up to 125); the side that loses it is
  squeezed down to 62, denser and heavier. Let go and the line returns to even, with resistance.
  Rows always fill the measure, so the whole block breathes as the balance shifts. On scroll the line
  gives way: the peach side takes the band.

  Two identical poster layers, each clipped to its field (exact inversion, letter by letter); the
  first carries the h1. Letter widths are measured at three axis values and interpolated per frame.
*/

const F0 = 100;
/** Row leading; keep in step with .rows line-height. Room for É, À and Ç between rows. */
const LEADING = 0.95;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function HeroRapport() {
  const t = useTranslations("hero");
  const tr = useTranslations("heroStudies.rapport");
  // Wide screens keep line 1 whole and balance line 2 over two rows; tall ones balance both.
  const portrait = useMediaQuery("(max-aspect-ratio: 1/1)");
  const rows = portrait
    ? [...balanceRows(t("title1"), 2), ...balanceRows(t("title2"), 2)]
    : [t("title1"), ...balanceRows(t("title2"), 2)];
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const layers = q<HTMLElement>("[data-layer]");
      const rowEls = layers.map((layer) => [...layer.querySelectorAll<HTMLElement>("[data-row]")]);
      const chEls = layers.map((layer) => [...layer.querySelectorAll<HTMLElement>("[data-ch]")]);
      const [rowsBox] = q<HTMLElement>("[data-rows]");
      const firstRows = rowEls[0];
      const firstChs = chEls[0];
      if (!rowsBox || !firstRows || !firstChs) return;
      const rowLengths = firstRows.map((row) => row.querySelectorAll("[data-ch]").length);
      const count = firstChs.length;

      const s = {
        split: 0.5,
        base: 0.5,
        push: 0,
        scroll: 0,
        intro: 1,
        drag: false,
        driven: false,
        cur: new Float32Array(count).fill(100),
        font: rowLengths.map(() => F0),
      };
      let advances: Advances[] = [];
      let box = { left: 0, width: 1, height: 1, heroWidth: 1 };
      let visible = true;

      const setLetter = (i: number, w: number) => {
        const width = w.toFixed(1);
        const weight = String(weightFor(w));
        for (const layer of chEls) {
          const node = layer[i];
          if (!node) continue;
          node.style.setProperty("--w", width);
          node.style.setProperty("--g", weight);
        }
      };
      const setRowFont = (r: number, px: number) => {
        for (const layer of rowEls) {
          const node = layer[r];
          if (node) node.style.fontSize = `${px.toFixed(2)}px`;
        }
      };

      /** Advance widths at the three samples, at F0, read from the first layer. */
      const measure = () => {
        firstRows.forEach((row) => (row.style.fontSize = `${F0}px`));
        const out: Advances[] = firstChs.map(() => [0, 0, 0]);
        SAMPLES.forEach((w, k) => {
          firstChs.forEach((node) => {
            node.style.setProperty("--w", String(w));
            node.style.setProperty("--g", String(weightFor(w)));
          });
          firstChs.forEach((node, i) => {
            const entry = out[i];
            if (entry) entry[k] = node.getBoundingClientRect().width;
          });
        });
        advances = out;
        const hero = el.getBoundingClientRect();
        const r = rowsBox.getBoundingClientRect();
        box = {
          left: r.left - hero.left,
          width: rowsBox.clientWidth,
          height: el.clientHeight * (portrait ? 0.6 : 0.56),
          heroWidth: hero.width,
        };
        s.font = s.font.map(() => -1);
        for (let i = 0; i < count; i++) setLetter(i, s.cur[i] ?? 100);
      };

      /** Fit each row to the measure, then give each letter the width of the side it stands on. */
      const layout = (dt: number) => {
        const sizes = rowLengths.map((len, r) => {
          const start = rowLengths.slice(0, r).reduce((a, b) => a + b, 0);
          let sum = 0;
          for (let i = start; i < start + len; i++)
            sum += advance(advances[i] ?? [1, 1, 1], s.cur[i] ?? 100);
          return (F0 * box.width) / Math.max(1, sum);
        });
        // A short row ("LA", "WE") would fill the width at a giant size: cap it near the others.
        const cap = Math.min(...sizes) * 1.9;
        sizes.forEach((px, r) => (sizes[r] = Math.min(px, cap)));
        const tall = sizes.reduce((a, b) => a + b * LEADING, 0);
        const fitDown = tall > box.height ? box.height / tall : 1;

        const boundary = s.split * box.heroWidth;
        const left = widthFor(s.split);
        const right = widthFor(1 - s.split);
        const ease = dt > 0 ? 1 - Math.exp(-11 * dt) : 1;

        let i = 0;
        rowLengths.forEach((len, r) => {
          const px = (sizes[r] ?? F0) * fitDown;
          if (Math.abs(px - (s.font[r] ?? 0)) > 0.05) {
            s.font[r] = px;
            setRowFont(r, px);
          }
          const scale = px / F0;
          let x = box.left;
          for (const end = i + len; i < end; i++) {
            const now = s.cur[i] ?? 100;
            const adv = advance(advances[i] ?? [1, 1, 1], now) * scale;
            const side = x + adv / 2 < boundary ? left : right;
            x += adv;
            const target = 62 + (side - 62) * s.intro;
            const next = now + (target - now) * ease;
            if (Math.abs(next - now) > 0.02) {
              s.cur[i] = next;
              setLetter(i, next);
            }
          }
        });
      };

      const tick = (_time: number, deltaMs: number) => {
        if (!visible || !advances.length) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        if (!s.driven) {
          const goal = clamp(s.base + s.push + s.scroll, 0.04, 0.96);
          s.split += (goal - s.split) * (1 - Math.exp(-(s.drag ? 16 : 2.6) * dt));
        }
        el.style.setProperty("--split", s.split.toFixed(4));
        layout(dt);
      };

      /* ---- Input --------------------------------------------------------------------------- */
      let demo: gsap.core.Timeline | null = null;
      const share = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 ? (e.clientX - r.left) / r.width : 0.5;
      };
      const onDown = (e: PointerEvent) => {
        if (e.button !== 0) return;
        demo?.kill();
        s.push = 0;
        s.drag = true;
        el.dataset.drag = "true";
        el.setPointerCapture(e.pointerId);
        s.push = clamp((share(e) - 0.5) * 0.92, -0.46, 0.46);
      };
      const onMove = (e: PointerEvent) => {
        if (s.drag) s.push = clamp((share(e) - 0.5) * 0.92, -0.46, 0.46);
        else if (e.pointerType === "mouse" && !demo?.isActive()) s.push = (share(e) - 0.5) * 0.12;
      };
      const onUp = (e: PointerEvent) => {
        if (!s.drag) return;
        s.drag = false;
        s.push = 0;
        el.dataset.drag = "false";
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      };
      const onLeave = () => {
        if (!s.drag && !demo?.isActive()) s.push = 0;
      };

      const resize = new ResizeObserver(() => {
        if (!advances.length) return;
        measure();
        layout(0);
      });
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        el.style.setProperty("--split", "0.5");
        void document.fonts.ready.then(() => {
          measure();
          layout(0);
          resize.observe(el);
        });
      });

      mm.add(MOTION_OK, () => {
        el.dataset.state = "ready";
        const letters = chEls.flat();
        s.split = 0;
        s.driven = true;
        s.intro = 0;
        s.cur.fill(62);
        el.style.setProperty("--split", "0");
        gsap.set(letters, { yPercent: 40, autoAlpha: 0 });
        gsap.set(q("[data-chrome]"), { autoAlpha: 0, y: 8 });

        void document.fonts.ready.then(() => {
          measure();
          layout(0);
          gsap.ticker.add(tick);
          resize.observe(el);
          io.observe(el);

          // The peach field sweeps in from the left and meets the black at the middle; the letters
          // rise squeezed and open up as the sides settle.
          const tl = gsap.timeline();
          tl.to(s, { split: 0.5, duration: 1.5, ease: EASE.inOut }, 0.1)
            .to(
              letters,
              {
                yPercent: 0,
                autoAlpha: 1,
                duration: 0.9,
                ease: EASE.out,
                stagger: { each: 0.012, from: "start" },
              },
              0.25,
            )
            .to(s, { intro: 1, duration: 1.4, ease: EASE.inOut }, 0.5)
            .to(q("[data-chrome]"), { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE.soft }, 1.4)
            .call(
              () => {
                s.driven = false;
                s.base = 0.5;
              },
              [],
              1.65,
            );

          // A short negotiation to show the mechanic, then it is the visitor's.
          demo = gsap
            .timeline({ delay: 1.9 })
            .to(s, { push: 0.15, duration: 1.0, ease: EASE.inOut })
            .to(s, { push: -0.13, duration: 1.2, ease: EASE.inOut })
            .to(s, { push: 0, duration: 1.0, ease: EASE.inOut });

          ScrollTrigger.create({
            trigger: el,
            start: "top top",
            end: "bottom top",
            onUpdate: (self) => {
              s.scroll = self.progress * 0.46;
            },
          });
        });

        el.addEventListener("pointerdown", onDown);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
        el.addEventListener("pointerleave", onLeave);

        return () => {
          gsap.ticker.remove(tick);
          el.removeEventListener("pointerdown", onDown);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerup", onUp);
          el.removeEventListener("pointercancel", onUp);
          el.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => {
        resize.disconnect();
        io.disconnect();
        mm.revert();
      };
    },
    { scope: root, dependencies: [portrait], revertOnUpdate: true },
  );

  const heading = `${t("title1")} ${t("title2")}`;

  return (
    <section
      ref={root}
      className={cn(styles.hero, archivo.variable)}
      data-theme="dark"
      data-state="pending"
      data-drag="false"
    >
      <div className={styles.field} aria-hidden="true" />
      <Poster
        className={styles.onDark}
        rows={rows}
        eyebrow={t("eyebrow")}
        hint={tr("hint")}
        heading={heading}
      />
      <Poster className={styles.onField} rows={rows} eyebrow={t("eyebrow")} hint={tr("hint")} />
      <div className={styles.handle} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <path d="M9 7 L4 12 L9 17 M15 7 L20 12 L15 17" />
        </svg>
      </div>
    </section>
  );
}

/** One poster layer. The first carries the h1; the second is its inverted twin, hidden from AT. */
function Poster({
  rows,
  eyebrow,
  hint,
  heading,
  className,
}: {
  rows: string[];
  eyebrow: string;
  hint: string;
  heading?: string;
  className?: string;
}) {
  const Heading = heading ? "h1" : "div";
  return (
    <div
      className={cn(styles.layer, className)}
      data-layer
      aria-hidden={heading ? undefined : true}
    >
      <div className={styles.poster}>
        <p className={styles.eyebrow} data-chrome>
          {eyebrow}
        </p>
        <Heading className={styles.rows} aria-label={heading} data-rows={heading ? "" : undefined}>
          {rows.map((row, r) => (
            <span key={`${row}-${r}`} className={styles.row} data-row aria-hidden="true">
              {[...row].map((ch, i) => (
                <span key={i} className={styles.ch} data-ch>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </span>
          ))}
        </Heading>
        <p className={styles.hint} data-chrome>
          {hint}
        </p>
      </div>
    </div>
  );
}
