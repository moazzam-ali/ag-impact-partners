"use client";

import { useLocale, useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { geistMono } from "../study-fonts";
import { createSignal } from "./accord-signal";
import { AccordSound } from "./accord-sound";
import styles from "./hero-accord.module.css";

/*
  Hero study "accord" (direction: L'Accord, negotiation as resonance; "accord" is both an agreement
  and a chord).

  Two strings come in from the left and right edges of a dark band, out of tune: different
  frequencies and phases, noise, phosphor trails. The headline is out of tune too, printed twice and
  jittering. Bring the cursor to the centre and they tune; hold there and they lock: the strings
  coincide, light runs out from the centre, the headline comes into focus, and the string comes to
  rest as one flat line. Without input it tunes itself after a few seconds; scrolling locks it at
  once. Scrolling on, the line retracts to its centre and drops down the page as the thread.
  Optional sound (off by default): two tones that beat out of tune and settle into a fifth.
*/

const TAU = Math.PI * 2;
/** Base wavenumber: about three waves across the band. */
const K0 = TAU * 3.2;
/** Readout frequencies, the same two tones the sound plays. */
const ROOT = 196;
const FIFTH = 293.66;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smoothstep = (a: number, b: number, v: number) => {
  const x = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export function HeroAccord() {
  const t = useTranslations("hero");
  const ta = useTranslations("heroStudies.accord");
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);
  const sound = useRef<AccordSound | null>(null);
  const soundLive = useRef(false);
  const [soundOn, setSoundOn] = useState(false);

  const toggleSound = () => {
    const next = !soundLive.current;
    soundLive.current = next;
    setSoundOn(next);
    if (next) {
      sound.current ??= new AccordSound();
      sound.current.on();
    } else {
      sound.current?.off();
    }
  };

  useEffect(
    () => () => {
      sound.current?.dispose();
      sound.current = null;
    },
    [],
  );

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [canvas] = q<HTMLCanvasElement>("[data-canvas]");
      const [band] = q<HTMLElement>("[data-band]");
      const [freqA] = q<HTMLElement>('[data-freq="a"]');
      const [freqB] = q<HTMLElement>('[data-freq="b"]');
      const [dphi] = q<HTMLElement>("[data-dphi]");
      if (!canvas || !band || !freqA || !freqB || !dphi) return;
      const reals = q<HTMLElement>("[data-real]");
      const ghostsA = q<HTMLElement>('[data-ghost="a"]');
      const ghostsB = q<HTMLElement>('[data-ghost="b"]');
      const ghostWords = q<HTMLElement>("[data-gw]");
      const chrome = q<HTMLElement>("[data-chrome]");

      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const signal = createSignal(canvas, {
        bg: token("--bg"),
        a: token("--accent"),
        b: token("--ink"),
        hot: token("--ink"),
      });

      const s = {
        time: 0,
        detune: 1,
        main: 1,
        introA: 0,
        introB: 0,
        pulse: 0,
        drop: 0,
        phaseA: 0,
        phaseB: Math.PI,
        kA: K0,
        kB: K0,
        pointer: { x: 0.5, y: 0.5, on: 0 },
        target: { x: 0.5, y: 0.5, on: 0 },
        lineY: 0.5,
        amp: 0.12,
        reveal: 0,
        interactive: false,
        interactiveAt: 0,
        locked: false,
        auto: false,
        hold: 0,
        lastMove: -10,
        sampledAt: -1,
      };
      let visible = true;
      const fmt = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

      const measure = () => {
        const c = canvas.getBoundingClientRect();
        const b = band.getBoundingClientRect();
        if (c.height <= 0) return;
        s.lineY = (b.top + b.height / 2 - c.top) / c.height;
        s.amp = (b.height * 0.36) / c.height;
      };

      /* ---- The headline and readouts follow the tuning ------------------------------------- */
      const paint = () => {
        const clarity = 1 - s.detune;
        const real = String(s.reveal * clarity ** 3);
        const ghost = String(s.reveal * 0.9 * (1 - clarity ** 4));
        const off = (s.detune * 0.045).toFixed(4);
        reals.forEach((node) => (node.style.opacity = real));
        ghostsA.forEach((node) => {
          node.style.opacity = ghost;
          node.style.transform = `translate3d(${off}em, 0, 0)`;
        });
        ghostsB.forEach((node) => {
          node.style.opacity = ghost;
          node.style.transform = `translate3d(-${off}em, 0, 0)`;
        });

        // Sampled about twelve times a second, so the jitter reads as a signal, not a wobble.
        if (s.time - s.sampledAt < 1 / 12) return;
        s.sampledAt = s.time;
        const j = s.detune;
        ghostWords.forEach((node) => {
          const x = ((Math.random() - 0.5) * 0.035 * j).toFixed(4);
          const y = ((Math.random() - 0.5) * 0.08 * j).toFixed(4);
          node.style.transform = `translate3d(${x}em, ${y}em, 0)`;
        });
        freqA.textContent = fmt.format(ROOT * (1 + 0.045 * j));
        freqB.textContent = fmt.format(FIFTH * (1 - 0.06 * j));
        dphi.textContent = String(
          Math.round((Math.abs(wrap(s.phaseA - s.phaseB)) * 180) / Math.PI),
        );
      };

      /* ---- The lock ------------------------------------------------------------------------ */
      const lock = () => {
        if (s.locked) return;
        s.locked = true;
        s.interactive = true;
        el.dataset.accord = "on";
        gsap.to(s, { introA: 1, introB: 1, duration: 0.4, ease: EASE.out });
        gsap.to(s, { detune: 0, duration: 0.55, ease: EASE.out });
        gsap.to(s, { main: 0, duration: 2.6, ease: "power2.inOut", delay: 0.35 });
        gsap.fromTo(
          s,
          { pulse: 0.001 },
          {
            pulse: 1,
            duration: 1.7,
            ease: "power2.out",
            delay: 0.2,
            onComplete: () => {
              s.pulse = 0;
            },
          },
        );
        if (soundLive.current) sound.current?.resolve();
      };

      /* ---- Frame loop ---------------------------------------------------------------------- */
      const tick = (_time: number, deltaMs: number) => {
        if (!visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        s.time += dt;

        const k = 1 - Math.exp(-7 * dt);
        s.pointer.x += (s.target.x - s.pointer.x) * k;
        s.pointer.y += (s.target.y - s.pointer.y) * k;
        s.pointer.on += (s.target.on - s.pointer.on) * k;

        if (s.interactive && !s.locked) {
          const since = s.time - s.interactiveAt;
          if (since > 9 || (since > 4 && s.time - s.lastMove > 1.2)) s.auto = true;
          const goal = s.auto
            ? 0
            : s.target.on
              ? smoothstep(0.04, 0.36, Math.abs(s.target.x - 0.5))
              : 1;
          s.detune += (goal - s.detune) * (1 - Math.exp(-(s.auto ? 1.3 : 2.6) * dt));
          if (s.detune < 0.06) {
            s.hold += dt;
            if (s.hold > 0.25) lock();
          } else {
            s.hold = 0;
          }
        }

        const d = s.detune;
        s.phaseA = (s.phaseA + 2.3 * (1 + 0.5 * d) * dt) % TAU;
        s.phaseB = (s.phaseB + 2.3 * (1 - 2 * d) * dt) % TAU;
        s.phaseB += wrap(s.phaseA - s.phaseB) * Math.min(1, (1 - d) ** 2 * 6 * dt);
        s.kA = K0 * (1 + 0.34 * d);
        s.kB = K0 * (1 - 0.27 * d);

        signal?.render(s);
        paint();
        if (soundLive.current) sound.current?.update(d);
      };

      /* ---- Input --------------------------------------------------------------------------- */
      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        s.target.x = (e.clientX - r.left) / r.width;
        s.target.y = (e.clientY - r.top) / r.height;
        s.target.on = 1;
        s.lastMove = s.time;
      };
      const onLeave = () => {
        s.target.on = 0;
      };

      const resize = new ResizeObserver(() => {
        measure();
        if (!visible || !s.interactive) signal?.render(s);
      });
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        el.dataset.accord = "on";
        Object.assign(s, { detune: 0, main: 0, introA: 1, introB: 1, reveal: 1, locked: true });
        measure();
        signal?.render(s);
        paint();
        resize.observe(el);
        void document.fonts.ready.then(() => {
          measure();
          signal?.render(s);
        });
      });

      mm.add(MOTION_OK, () => {
        el.dataset.state = "ready";
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        measure();
        paint();

        const tl = gsap.timeline();
        tl.to(s, { introA: 1, duration: 1.6, ease: EASE.inOut }, 0.15)
          .to(s, { introB: 1, duration: 1.6, ease: EASE.inOut }, 0.3)
          .to(s, { reveal: 1, duration: 1.2, ease: EASE.soft }, 0.35)
          .to(chrome, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, ease: EASE.soft }, 1.1)
          .call(
            () => {
              s.interactive = true;
              s.interactiveAt = s.time;
            },
            [],
            1.5,
          );

        // Scrolling locks at once; past the lock, the line retracts and drops down the page.
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom top",
          onUpdate: (self) => {
            if (!s.locked && self.progress > 0.01) lock();
            // The thread reaches the bottom of the band a little past halfway.
            s.drop = s.locked ? Math.min(1, self.progress / 0.6) : 0;
          },
        });

        gsap.ticker.add(tick);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        resize.observe(el);
        io.observe(el);
        void document.fonts.ready.then(measure);

        return () => {
          gsap.ticker.remove(tick);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => {
        resize.disconnect();
        io.disconnect();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={cn(styles.hero, geistMono.variable)}
      data-theme="dark"
      data-state="pending"
      data-accord="off"
    >
      <canvas className={styles.canvas} data-canvas aria-hidden="true" />
      <div className={styles.frame}>
        <p className={styles.eyebrow} data-chrome>
          {t("eyebrow")}
        </p>
        <h1 className={styles.headline}>
          <TunedLine text={t("title1")} className={styles.line1} />{" "}
          <TunedLine text={t("title2")} className={styles.line2} />
        </h1>
        <div className={styles.band} data-band aria-hidden="true">
          <span className={cn(styles.readout, styles.readoutA)} data-chrome>
            <span className={styles.party}>{ta("partyA")}</span>{" "}
            <span data-freq="a">{ROOT.toFixed(1)}</span> {ta("unit")}
          </span>
          <span className={cn(styles.readout, styles.readoutB)} data-chrome>
            <span data-freq="b">{FIFTH.toFixed(1)}</span> {ta("unit")}{" "}
            <span className={styles.party}>{ta("partyB")}</span>
          </span>
        </div>
        <div className={styles.footer}>
          <p className={styles.hint} data-chrome>
            {ta("hint")}
          </p>
          <p className={styles.status} data-chrome aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.off}>{ta("status.off")}</span>
            <span className={styles.on}>{ta("status.on")}</span>
            <span className={styles.phase}>
              {ta("phase")} <span data-dphi>180</span>°
            </span>
          </p>
          <button
            type="button"
            className={styles.sound}
            data-chrome
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            {ta("sound.label")} · {soundOn ? ta("sound.on") : ta("sound.off")}
          </button>
        </div>
      </div>
    </section>
  );
}

/** One headline line: the real text, and two out-of-tune copies that converge on it. */
function TunedLine({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  const ghost = (id: "a" | "b") => (
    <span
      className={cn(styles.ghost, id === "a" ? styles.ghostA : styles.ghostB)}
      data-ghost={id}
      aria-hidden="true"
    >
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className={styles.ghostWord} data-gw>
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );

  return (
    <span className={cn(styles.line, className)}>
      <span className={styles.real} data-real>
        {text}
      </span>
      {ghost("a")}
      {ghost("b")}
    </span>
  );
}
