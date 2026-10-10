"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import {
  COUNT,
  MEET,
  applyGather,
  createRope,
  drawRope,
  liftVisibility,
  longestSide,
  nearest,
  placeRope,
  settle,
  signatureHeight,
  snapToRest,
  stepRope,
  updateGlow,
  type Ink,
  type Rope,
} from "./fil-rope";
import { SIGNATURE_INTRO } from "../signature-shell";
import styles from "./fil-thread.module.css";

/*
  "Le fil": two hairlines slide in from the edges along one line and meet in the centre, where a
  dot lands (the two sides of the table). The joined line then gathers itself into the signature,
  every point travelling to its place matched by arc length, from the meeting point outward. Once
  signed, the thread can be pulled: grab it, it deforms like a rope (Verlet, anchored ends, a soft
  spring home); let go, it eases back with no bounce.
*/

/** Intro timing, seconds. The two lines start sliding in while the headline is still rising. */
const LINE_AT = SIGNATURE_INTRO.signature;
const LINE_DURATION = 1;
const DOT_AT = LINE_AT + 0.85;
const GATHER_AT = LINE_AT + 1.05;
const GATHER_SPREAD = 1.3;
const GATHER_EACH = 0.9;
export const GATHER_END = GATHER_AT + GATHER_SPREAD + GATHER_EACH;

/** Interaction. */
const GRAB_RADIUS = 24;
const HOVER_RADIUS = 90;
const MAX_PULL = 210;
const RETURN_OMEGA = 6.5;

const MAX_DPR = 2;

export function FilThread() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const host = root.current;
      const canvas = host?.querySelector("canvas");
      const ctx = canvas?.getContext("2d");
      if (!host || !canvas || !ctx) return;
      const section = host.closest("section") ?? host;

      const rope: Rope = createRope();
      const ink: Ink = { ink: "#f4f1ec", accent: "#f4b07b" };
      let width = 0;
      let height = 0;

      const readInk = () => {
        const cs = getComputedStyle(host);
        ink.ink = cs.getPropertyValue("--ink").trim() || ink.ink;
        ink.accent = cs.getPropertyValue("--accent").trim() || ink.accent;
      };

      /** Fits the canvas and places the signature between the two headline lines. */
      const layout = () => {
        const box = host.getBoundingClientRect();
        width = box.width;
        height = box.height;
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const t1 = section.querySelector('[data-title="1"]')?.getBoundingClientRect();
        const t2 = section.querySelector('[data-title="2"]')?.getBoundingClientRect();
        const top = t1 ? t1.bottom - box.top : height * 0.34;
        const bottom = t2 ? t2.top - box.top : height * 0.77;
        const room = Math.max(120, bottom - top - 96);
        let sigWidth = Math.min(width * 0.62, 1000);
        if (signatureHeight(sigWidth) > room) sigWidth *= room / signatureHeight(sigWidth);
        placeRope(rope, {
          width,
          height,
          cx: width / 2,
          cy: (top + bottom) / 2,
          sigWidth,
        });
      };

      const paint = (knot = 0) => {
        ctx.clearRect(0, 0, width, height);
        drawRope(ctx, rope, ink, knot);
      };

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        readInk();
        layout();
        snapToRest(rope);
        rope.show.fill(1);
        liftVisibility(rope);
        paint();
        const ro = new ResizeObserver(() => {
          layout();
          snapToRest(rope);
          paint();
        });
        ro.observe(host);
        return () => ro.disconnect();
      });

      mm.add(MOTION_OK, () => {
        readInk();
        layout();

        type Mode = "intro" | "idle" | "held" | "return";
        let mode: Mode = "intro";
        let grabbed = -1;
        let pointerX = 0;
        let pointerY = 0;
        let hovering = false;
        let glowing = false;
        let returnT = 0;
        const ox = new Float32Array(COUNT);
        const oy = new Float32Array(COUNT);
        const intro = { line: 0, dot: 0, gather: 0, knot: 1 };

        /* ---- intro state ---- */
        const reach = longestSide(rope);
        const introFrame = () => {
          const t = intro.gather * (GATHER_SPREAD + GATHER_EACH);
          const sm = rope.s[MEET] ?? 0;
          for (let i = 0; i < COUNT; i++) {
            const delay = (Math.abs((rope.s[i] ?? 0) - sm) / reach) * GATHER_SPREAD;
            rope.gather[i] = settle((t - delay) / GATHER_EACH);
          }
          applyGather(rope);
          // Each hairline is drawn from its edge to its moving tip, with a short soft tip.
          const mid = width / 2;
          const tipL = -24 + (mid + 24) * intro.line;
          const tipR = width + 24 - (width + 24 - mid) * intro.line;
          for (let i = 0; i < COUNT; i++) {
            const lx = rope.lx[i] ?? 0;
            const d = i <= MEET ? tipL - lx : lx - tipR;
            const onLine = Math.min(1, Math.max(0, d / 14));
            const g = rope.gather[i] ?? 0;
            rope.show[i] = g > 0 ? 1 : onLine;
          }
          liftVisibility(rope);
        };

        /* ---- the loop: runs only while something moves and the hero is on screen ---- */
        let raf = 0;
        let visible = true;
        let last = 0;
        const busy = () => mode === "intro" || mode === "held" || mode === "return" || glowing;

        const frame = (now: number) => {
          raf = 0;
          const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
          last = now;

          if (mode === "intro") introFrame();
          else if (mode === "held") {
            const rx = rope.rx[grabbed] ?? 0;
            const ry = rope.ry[grabbed] ?? 0;
            const dx = pointerX - rx;
            const dy = pointerY - ry;
            const d = Math.hypot(dx, dy);
            const k = d > 0 ? (MAX_PULL * Math.tanh(d / MAX_PULL)) / d : 0;
            stepRope(rope, grabbed, rx + dx * k, ry + dy * k);
          } else if (mode === "return") {
            returnT += dt;
            const u = RETURN_OMEGA * returnT;
            const f = (1 + u) * Math.exp(-u);
            if (f < 0.002) {
              snapToRest(rope);
              mode = "idle";
            } else {
              for (let i = 0; i < COUNT; i++) {
                const x = (rope.rx[i] ?? 0) + (ox[i] ?? 0) * f;
                const y = (rope.ry[i] ?? 0) + (oy[i] ?? 0) * f;
                rope.x[i] = x;
                rope.y[i] = y;
                rope.px[i] = x;
                rope.py[i] = y;
              }
            }
          }
          if (mode !== "intro") {
            glowing = updateGlow(rope, pointerX, pointerY, HOVER_RADIUS, hovering);
          }
          paint(mode === "intro" ? intro.dot * intro.knot : 0);

          if (busy() && visible) raf = requestAnimationFrame(frame);
          else last = 0;
        };
        const wake = () => {
          if (!raf && visible) raf = requestAnimationFrame(frame);
        };

        /* ---- intro timeline ---- */
        rope.show.fill(0);
        rope.gather.fill(0);
        applyGather(rope);
        const tl = gsap.timeline({
          onUpdate: wake,
          onComplete: () => {
            rope.gather.fill(1);
            snapToRest(rope);
            rope.show.fill(1);
            liftVisibility(rope);
            mode = "idle";
            wake();
          },
        });
        tl.to(intro, { line: 1, duration: LINE_DURATION, ease: EASE.inOut }, LINE_AT)
          .to(intro, { dot: 1, duration: 0.5, ease: EASE.pop }, DOT_AT)
          .to(intro, { gather: 1, duration: GATHER_SPREAD + GATHER_EACH, ease: "none" }, GATHER_AT)
          .to(intro, { knot: 0, duration: 0.6, ease: EASE.soft }, GATHER_AT + 0.5);
        wake();

        /* ---- pointer ---- */
        const local = (e: PointerEvent) => {
          const r = canvas.getBoundingClientRect();
          pointerX = e.clientX - r.left;
          pointerY = e.clientY - r.top;
        };
        const onMove = (e: PointerEvent) => {
          local(e);
          if (mode === "intro") return;
          if (mode !== "held") {
            const near = nearest(rope, pointerX, pointerY, GRAB_RADIUS) >= 0;
            canvas.style.cursor = near ? "grab" : "";
          }
          hovering = true;
          glowing = true;
          wake();
        };
        const onLeave = () => {
          hovering = false;
          if (mode !== "held") canvas.style.cursor = "";
          wake();
        };
        const onDown = (e: PointerEvent) => {
          if (mode === "intro" || e.button !== 0) return;
          local(e);
          const hit = nearest(rope, pointerX, pointerY, GRAB_RADIUS);
          if (hit < 0) return;
          e.preventDefault();
          canvas.setPointerCapture(e.pointerId);
          if (mode === "return") {
            rope.px.set(rope.x);
            rope.py.set(rope.y);
          }
          grabbed = hit;
          mode = "held";
          canvas.style.cursor = "grabbing";
          wake();
        };
        const onUp = (e: PointerEvent) => {
          if (mode !== "held") return;
          if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
          for (let i = 0; i < COUNT; i++) {
            ox[i] = (rope.x[i] ?? 0) - (rope.rx[i] ?? 0);
            oy[i] = (rope.y[i] ?? 0) - (rope.ry[i] ?? 0);
          }
          grabbed = -1;
          returnT = 0;
          mode = "return";
          local(e);
          canvas.style.cursor = nearest(rope, pointerX, pointerY, GRAB_RADIUS) >= 0 ? "grab" : "";
          wake();
        };
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerleave", onLeave);
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        /* ---- visibility and resize ---- */
        const io = new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (visible) wake();
        });
        io.observe(host);
        const ro = new ResizeObserver(() => {
          layout();
          if (mode === "idle") snapToRest(rope);
          if (mode !== "intro") paint();
          wake();
        });
        ro.observe(host);

        return () => {
          if (raf) cancelAnimationFrame(raf);
          io.disconnect();
          ro.disconnect();
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerleave", onLeave);
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          canvas.style.cursor = "";
        };
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.thread} aria-hidden="true">
      <canvas className={styles.canvas} />
    </div>
  );
}
