"use client";

import { useId, useRef } from "react";

import { CustomEase, gsap, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { SIGNATURE_INTRO } from "../signature-shell";
import { FIGMA_LAYOUT, measureLayout, type Layout } from "./figma-anchors";
import {
  FIGMA_ANCHORS,
  FIGMA_FRAME,
  FIGMA_INK,
  FIGMA_LEAD,
  FIGMA_OUTRO,
  FIGMA_PEN,
} from "./figma-geometry";
import { bendLine, ribbon, routePath, type Point, type RibbonNib } from "./figma-line";
import styles from "./figma-signature.module.css";

/** One pen, one speed: design px per second along the lines and the letters alike. */
const SPEED = 1500;
/** A pen lift: a short pause, then the pen crosses the gap a little faster than it writes. */
const LIFT = { pause: 0.06, speed: 2400 } as const;
/** The pen's own ease in and out costs this much time over a constant-speed run. */
const EASED = 1.08;

// Same nib as the script: hairline sideways and up, swelling on the slanted downstrokes.
const LEAD_NIB: RibbonNib = {
  hair: 2.3,
  swell: 4.6,
  startWidth: 0.8,
  startTaper: 28,
  endWidth: 2,
  endTaper: 10,
};
const OUTRO_NIB: RibbonNib = {
  hair: 2.3,
  swell: 4.6,
  startWidth: 1.9,
  startTaper: 10,
  endWidth: 0.7,
  endTaper: 40,
};
const LINE_MASK_WIDTH = 9;
const DOT_RADIUS = 3.8;

const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });

function lines(layout: Layout) {
  const lead = bendLine(FIGMA_LEAD, sub(layout.start, FIGMA_ANCHORS.start), layout.script);
  const outro = bendLine(FIGMA_OUTRO, sub(layout.end, FIGMA_ANCHORS.end), layout.script);
  const length = (samples: typeof lead) => samples[samples.length - 1]?.s ?? 0;
  return {
    lead: { route: routePath(lead), d: ribbon(lead, LEAD_NIB), length: length(lead) },
    outro: { route: routePath(outro), d: ribbon(outro, OUTRO_NIB), length: length(outro) },
  };
}

// The Figma composition, for the server render and until the headline is measured.
const INITIAL = lines(FIGMA_LAYOUT);
const { width: W, height: H } = FIGMA_FRAME;
// Room around the frame for masks: the lines reach outside it when the hero is taller than 982.
const MASK_BOX = { x: -W / 2, y: -H / 2, width: W * 2, height: H * 2 };

const startOf = (d: string): Point => {
  const m = /^M(-?[\d.]+)[ ,]?(-?[\d.]+)/.exec(d);
  return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) };
};
const STROKE_START = FIGMA_PEN.map((stroke) => startOf(stroke.chunks[0]?.[0] ?? ""));

/*
  The "figma" signature: Figma frame 1:155, improved. One continuous peach line leaves the full stop
  of title 1, loops down to the left, writes "ag impact partners" and sweeps out, back under the script
  and around to land on the first letter of title 2. One pen at one speed: the lines are revealed
  through a mask drawn along their centreline, the letters through per-letter masks drawn along their
  skeleton in writing order (DrawSVG), and a terracotta pen point leads the whole way, travelling
  through the air on pen lifts. The two ends follow the measured headline (French or English, any
  height); the script stays centred between the lines.
*/
export function FigmaSignature() {
  const root = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  useGSAP(
    () => {
      const el = root.current;
      const section = el?.closest("section");
      const art = el?.querySelector<SVGSVGElement>("[data-art]");
      const q = gsap.utils.selector(el);
      const [leadInk] = q<SVGPathElement>('[data-ink="lead"]');
      const [leadRoute] = q<SVGPathElement>('[data-route="lead"]');
      const [outroInk] = q<SVGPathElement>('[data-ink="outro"]');
      const [outroRoute] = q<SVGPathElement>('[data-route="outro"]');
      const [script] = q<SVGGElement>("[data-script]");
      const [dot] = q<SVGCircleElement>("[data-pen]");
      if (
        !section ||
        !art ||
        !leadInk ||
        !leadRoute ||
        !outroInk ||
        !outroRoute ||
        !script ||
        !dot
      ) {
        return;
      }
      const chunks = FIGMA_PEN.map((stroke, si) =>
        stroke.chunks.map((_, ci) => q<SVGPathElement>(`[data-chunk="${si}-${ci}"]`)[0]),
      );

      // Bend the lines to the rendered headline and centre the script between its two lines.
      let layout: Layout = FIGMA_LAYOUT;
      const fit = () => {
        layout = measureLayout(art, section);
        const { lead, outro } = lines(layout);
        leadInk.setAttribute("d", lead.d);
        leadRoute.setAttribute("d", lead.route);
        outroInk.setAttribute("d", outro.d);
        outroRoute.setAttribute("d", outro.route);
        script.setAttribute("transform", `translate(${layout.script.x} ${layout.script.y})`);
        return { lead: lead.length, outro: outro.length };
      };
      let writing = false;
      let alive = true;
      const refit = () => {
        if (alive && !writing) fit();
      };
      const resize = new ResizeObserver(refit);
      resize.observe(section);
      void document.fonts.ready.then(refit);
      const lengths = fit();

      const mm = gsap.matchMedia();

      // Reduced motion: the finished composition, still (everything is drawn by default).
      mm.add(REDUCED_MOTION, () => {
        gsap.set(dot, { autoAlpha: 0 });
      });

      mm.add(MOTION_OK, () => {
        const all = chunks.flat().filter((p): p is SVGPathElement => p !== undefined);
        const routes = [leadRoute, outroRoute];
        gsap.set([...routes, ...all], { drawSVG: "0% 0%", visibility: "hidden" });
        gsap.set(dot, { autoAlpha: 0, attr: { r: DOT_RADIUS } });

        const penIn = CustomEase.create(
          "figma-pen-in",
          "M0,0 C0.07,0 0.11,0.045 0.16,0.1 C0.44,0.4 0.72,0.7 1,1",
        );
        const penOut = CustomEase.create(
          "figma-pen-out",
          "M0,0 C0.28,0.3 0.56,0.6 0.84,0.9 C0.89,0.955 0.93,1 1,1",
        );

        const pen: Point = { x: FIGMA_ANCHORS.start.x, y: FIGMA_ANCHORS.start.y };
        const place = () => dot.setAttribute("transform", `translate(${pen.x} ${pen.y})`);
        // The pen point rides the tip of whatever is being drawn.
        const follow = (path: SVGPathElement, offset: () => Point) => {
          let length = 0;
          return {
            onStart: () => {
              length = path.getTotalLength();
            },
            onUpdate(this: gsap.core.Tween) {
              const p = path.getPointAtLength(this.ratio * length);
              const o = offset();
              pen.x = p.x + o.x;
              pen.y = p.y + o.y;
              place();
            },
          };
        };
        const none = () => ({ x: 0, y: 0 });
        const inScript = () => layout.script;

        const tl = gsap.timeline({
          delay: SIGNATURE_INTRO.signature,
          onComplete: () => {
            writing = false;
            // Fully drawn whatever the lines' length after a later resize.
            gsap.set(routes, { clearProps: "strokeDasharray,strokeDashoffset" });
          },
        });

        // The pen touches down right of the full stop (measured again now that the fonts are in).
        tl.call(() => {
          writing = true;
          fit();
          gsap.set(routes, { drawSVG: "0% 0%" });
          pen.x = layout.start.x;
          pen.y = layout.start.y;
          place();
        })
          .to(dot, { autoAlpha: 1, duration: 0.15, ease: EASE.soft })
          .set(leadRoute, { visibility: "visible" }, "<")
          .to(
            leadRoute,
            {
              drawSVG: "0% 100%",
              duration: (lengths.lead / SPEED) * EASED,
              ease: penIn,
              ...follow(leadRoute, none),
            },
            "<",
          );

        FIGMA_PEN.forEach((stroke, si) => {
          const start = STROKE_START[si] ?? pen;
          if (stroke.entry === "lift") {
            // Off the paper: the point fades a little while it travels to the next stroke.
            const duration = LIFT.pause + stroke.air / LIFT.speed;
            tl.to(pen, {
              x: () => start.x + layout.script.x,
              y: () => start.y + layout.script.y,
              duration,
              ease: EASE.inOut,
              onUpdate: place,
            }).to(dot, { opacity: 0.45, duration: duration / 2, yoyo: true, repeat: 1 }, "<");
          } else if (stroke.air > 1) {
            // Contact: the pen moves on to the next letter at writing speed.
            tl.to(pen, {
              x: () => start.x + layout.script.x,
              y: () => start.y + layout.script.y,
              duration: stroke.air / SPEED,
              ease: EASE.linear,
              onUpdate: place,
            });
          }
          stroke.chunks.forEach(([, , weight], ci) => {
            const path = chunks[si]?.[ci];
            if (!path) return;
            tl.set(path, { visibility: "visible" }).to(path, {
              drawSVG: "0% 100%",
              duration: weight / SPEED,
              ease: EASE.linear,
              ...follow(path, inScript),
            });
          });
        });

        // Out of the s, back under the script, and down onto title 2's first letter.
        tl.set(outroRoute, { visibility: "visible" })
          .to(outroRoute, {
            drawSVG: "0% 100%",
            duration: (lengths.outro / SPEED) * EASED,
            ease: penOut,
            ...follow(outroRoute, none),
          })
          .to(dot, { autoAlpha: 0, attr: { r: 0 }, duration: 0.45, ease: EASE.soft });

        return () => {
          writing = false;
        };
      });

      return () => {
        alive = false;
        mm.revert();
        resize.disconnect();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={styles.stage} aria-hidden="true">
      <svg className={styles.art} viewBox={`0 0 ${W} ${H}`} data-art>
        <defs>
          <mask id={`${uid}-lead`} className={styles.mask} maskUnits="userSpaceOnUse" {...MASK_BOX}>
            <path
              className={styles.route}
              d={INITIAL.lead.route}
              strokeWidth={LINE_MASK_WIDTH}
              data-route="lead"
            />
          </mask>
          <mask
            id={`${uid}-outro`}
            className={styles.mask}
            maskUnits="userSpaceOnUse"
            {...MASK_BOX}
          >
            <path
              className={styles.route}
              d={INITIAL.outro.route}
              strokeWidth={LINE_MASK_WIDTH}
              data-route="outro"
            />
          </mask>
          {FIGMA_INK.map((_, group) => (
            <mask
              key={group}
              id={`${uid}-ink-${group}`}
              className={styles.mask}
              maskUnits="userSpaceOnUse"
              {...MASK_BOX}
            >
              {FIGMA_PEN.map((stroke, si) =>
                stroke.group === group
                  ? stroke.chunks.map(([d, width], ci) => (
                      <path
                        key={`${si}-${ci}`}
                        className={styles.route}
                        d={d}
                        strokeWidth={width}
                        data-chunk={`${si}-${ci}`}
                      />
                    ))
                  : null,
              )}
            </mask>
          ))}
        </defs>
        <path
          className={styles.ink}
          d={INITIAL.lead.d}
          mask={`url(#${uid}-lead)`}
          data-ink="lead"
        />
        <g data-script>
          {FIGMA_INK.map((d, group) => (
            <path key={group} className={styles.ink} d={d} mask={`url(#${uid}-ink-${group})`} />
          ))}
        </g>
        <path
          className={styles.ink}
          d={INITIAL.outro.d}
          mask={`url(#${uid}-outro)`}
          data-ink="outro"
        />
        <circle className={styles.pen} r={DOT_RADIUS} data-pen />
      </svg>
    </div>
  );
}
