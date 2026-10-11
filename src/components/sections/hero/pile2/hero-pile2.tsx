"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Words } from "@/components/motion/words";
import { ButtonLink } from "@/components/ui/button-link";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { type DocCopy } from "./documents";
import { FieldMark, FilDomaines } from "./fil-domaines";
import styles from "./hero-pile2.module.css";
import { BUILT, createPile2Scene, landedBy, SHEETS } from "./pile2-scene";

/*
  Hero study "pile2": Pile, redone. The headline in Instrument Sans at poster size, with the ream of
  300 contracts standing on it. The ream builds quickly and softly. Point at a sheet and it slides
  out; click it and it is drawn out, turned to you and laid on top, a different document each time
  (one per field); a leader line names the field on top. Under it all, "le fil des domaines": the
  five fields on one running thread that draws each of them. Follows the site theme, dark or light.

  The "contrats négociés" label for 300 is still to be confirmed by the client.
*/

export function HeroPile2() {
  const t = useTranslations("hero");
  const tp = useTranslations("heroStudies.pile2");
  const studies = useMessages().heroStudies;
  const fields = studies.pile2.fields;
  const figure = studies.confidentiel.facts[2];
  const copy: DocCopy = {
    fields,
    ref: studies.signataire.ref,
    between: [studies.signataire.between[0] ?? "", studies.signataire.between[1] ?? ""],
    parties: [studies.signataire.parties[0] ?? "", studies.signataire.parties[1] ?? ""],
    place: studies.signataire.place,
    stamp: studies.confidentiel.stamp,
    figure: { value: figure?.value ?? "", label: figure?.label ?? "" },
  };
  const [top, setTop] = useState(0);
  const field = fields[top] ?? fields[0];
  const root = useRef<HTMLElement>(null);
  const random = useRef<() => void>(() => {});

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [canvas] = q<HTMLCanvasElement>("[data-canvas]");
      const [stage] = q<HTMLElement>("[data-stage]");
      const [count] = q<HTMLElement>("[data-count]");
      const [pill] = q<HTMLElement>("[data-pill]");
      const [pillText] = q<HTMLElement>("[data-pill-text]");
      const [leader] = q<SVGPolylineElement>("[data-leader]");
      const [knot] = q<SVGCircleElement>("[data-knot]");
      const [callout] = q<HTMLElement>("[data-callout]");
      const [one] = q<HTMLElement>("[data-one]");
      const [two] = q<HTMLElement>("[data-two]");
      if (!canvas || !stage || !count || !pill || !pillText || !leader || !knot || !callout) return;
      if (!one || !two) return;
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const reduced = window.matchMedia(REDUCED_MOTION).matches;
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const font = token("--font-instrument-sans") || "sans-serif";
      const dark = () => document.documentElement.dataset.theme === "dark";

      let scene: ReturnType<typeof createPile2Scene> | null = null;
      let clock = reduced ? 10 : 0;
      let visible = true;
      let alive = true;
      let shown = -1;
      let lastInput = 0;
      let lastAuto = 0;
      const aim = { x: 0, y: 0, moved: false, inside: false };
      const pillX = gsap.quickTo(pill, "x", { duration: 0.35, ease: EASE.out });
      const pillY = gsap.quickTo(pill, "y", { duration: 0.35, ease: EASE.out });

      // Line two is set a little wider than line one (desktop), within the frame: measured at its
      // CSS size, then scaled.
      const wide = window.matchMedia("(min-width: 1024px)");
      const level = () => {
        el.style.removeProperty("--two");
        if (!wide.matches) return;
        const room = two.parentElement?.getBoundingClientRect().width ?? Infinity;
        const target = Math.min(one.getBoundingClientRect().width * 1.12, room);
        const natural = two.getBoundingClientRect().width;
        const size = parseFloat(getComputedStyle(two).fontSize);
        if (target > 0 && natural > 0) {
          el.style.setProperty("--two", `${((size * target) / natural).toFixed(2)}px`);
        }
      };
      level();
      void document.fonts.ready.then(() => alive && level());
      wide.addEventListener("change", level);
      const lines = new ResizeObserver(level);
      lines.observe(one);

      const tie = { x: 0, y: 0, on: "" };
      const fit = () => {
        const box = el.getBoundingClientRect();
        const c = callout.getBoundingClientRect();
        tie.x = c.left - box.left - 14;
        tie.y = c.top - box.top + 22;
        if (!scene) return;
        const s = stage.getBoundingClientRect();
        scene.resize(canvas.clientWidth, canvas.clientHeight, {
          x: s.left - box.left + s.width / 2,
          y: s.top - box.top + s.height / 2,
          w: s.width,
          h: s.height,
        });
      };

      const blocked = (target: EventTarget | null) =>
        target instanceof Element && !!target.closest("a, button, [data-fil]");

      const tick = (_t: number, deltaMs: number) => {
        if (!scene || !visible) return;
        clock += Math.min(0.05, deltaMs / 1000);

        if (aim.moved) {
          aim.moved = false;
          const hit = aim.inside ? scene.pick(aim.x, aim.y) : null;
          scene.hover(hit?.kind === "sheet" ? hit.id : -1);
          el.dataset.pick = hit ? "on" : "off";
          if (hit) {
            pillText.textContent =
              hit.kind === "sheet" ? `${tp("sheet")} ${hit.place}` : tp("random");
          }
        }
        // Left alone, a sheet comes up now and then on its own.
        if (clock > BUILT + 2.5 && clock - lastInput > 7 && clock - lastAuto > 6.5) {
          lastAuto = clock;
          scene.pullRandom();
        }
        scene.frame(clock);

        const n = clock < BUILT ? landedBy(clock) : SHEETS;
        if (n !== shown) {
          shown = n;
          count.textContent = String(n);
        }
        // The leader line from the document on top to the callout naming it.
        const a = scene.anchor();
        if (a) {
          leader.setAttribute("points", `${a.x},${a.y} ${tie.x - 40},${tie.y} ${tie.x},${tie.y}`);
          knot.setAttribute("cx", String(a.x));
          knot.setAttribute("cy", String(a.y));
        }
        const on = a ? "on" : "off";
        if (on !== tie.on) el.dataset.leader = tie.on = on;
      };

      const onMove = (e: PointerEvent) => {
        const box = canvas.getBoundingClientRect();
        aim.x = e.clientX - box.left;
        aim.y = e.clientY - box.top;
        aim.inside = e.pointerType === "mouse" && !blocked(e.target);
        aim.moved = true;
        lastInput = clock;
        if (!reduced) scene?.setPointer((aim.x / box.width) * 2 - 1, (aim.y / box.height) * 2 - 1);
        const section = el.getBoundingClientRect();
        pillX(e.clientX - section.left);
        pillY(e.clientY - section.top);
      };
      const onLeave = () => {
        aim.inside = false;
        aim.moved = true;
        scene?.setPointer(0, 0);
      };
      const onClick = (e: MouseEvent) => {
        if (!scene || blocked(e.target)) return;
        const box = canvas.getBoundingClientRect();
        const hit = scene.pick(e.clientX - box.left, e.clientY - box.top);
        if (!hit) return;
        lastInput = clock;
        if (hit.kind === "sheet") scene.pull(hit.id);
        else scene.pullRandom();
        aim.moved = true;
      };
      random.current = () => {
        lastInput = clock;
        scene?.pullRandom();
      };

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 10 });
        gsap
          .timeline({ delay: 0.1 })
          .to(words, {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(
            chrome,
            { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft, stagger: 0.06 },
            0.35,
          );
      });

      void Promise.all(
        [400, 500, 600, 700].map((w) => document.fonts.load(`${w} 40px ${font}`)),
      ).then(() => {
        if (!alive) return;
        scene = createPile2Scene({
          canvas,
          copy,
          font,
          dark: dark(),
          reduced,
          onTop: setTop,
          inks: {
            print: token("--print"),
            soft: token("--print-soft"),
            rule: token("--print-rule"),
            ink: token("--sign-ink"),
            pen: token("--pen"),
            accent: token("--accent"),
          },
        });
        fit();
        el.dataset.scene = "ready";
        gsap.ticker.add(tick);
      });

      const theme = new MutationObserver(() => scene?.setTheme(dark()));
      theme.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      const resize = new ResizeObserver(fit);
      resize.observe(canvas);
      resize.observe(stage);
      resize.observe(callout);
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });
      io.observe(el);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("click", onClick);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("click", onClick);
        theme.disconnect();
        wide.removeEventListener("change", level);
        lines.disconnect();
        resize.disconnect();
        io.disconnect();
        scene?.dispose();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.hero} data-state="pending">
      <canvas className={styles.canvas} data-canvas aria-hidden="true" />
      <svg className={styles.leader} aria-hidden="true">
        <polyline data-leader points="" />
        <circle data-knot r="3.5" />
      </svg>

      <div className={styles.frame}>
        <p className={styles.eyebrow} data-chrome>
          {t("eyebrow")}
        </p>
        <h1 className={styles.headline} data-title>
          <span className={styles.one} data-one>
            <Words text={t("title1")} />
          </span>{" "}
          <span className={styles.two} data-two>
            <Words text={t("title2")} />
          </span>
        </h1>

        <div className={styles.stage} data-stage aria-hidden="true" />

        <div className={styles.aside} data-chrome>
          <p className={styles.sub}>{t("sub")}</p>
          <div className={styles.actions}>
            <ButtonLink href="/contact">{t("primary")}</ButtonLink>
            <ButtonLink href="/expertise" variant="ghost">
              {t("secondary")}
            </ButtonLink>
          </div>
          <p className={styles.figure}>
            <span className={styles.count} data-count>
              {SHEETS}
            </span>
            <span className={styles.label}>{tp("label")}</span>
          </p>
        </div>

        <div className={styles.callout} data-callout data-chrome aria-live="polite">
          <p className={styles.onTop}>{tp("onTop")}</p>
          <div key={top} className={styles.doc}>
            <p className={styles.docTitle}>
              <FieldMark index={top} className={styles.docMark} />
              {field?.title}
            </p>
            <p className={styles.docBody}>{field?.body}</p>
          </div>
          <p className={styles.hint}>
            {tp("hint")}{" "}
            <button type="button" className={styles.shuffle} onClick={() => random.current()}>
              {tp("random")}
            </button>
          </p>
        </div>

        <FilDomaines className={styles.fil} fields={fields} label={tp("services")} active={top} />
      </div>

      <p className={styles.pill} data-pill aria-hidden="true">
        <span data-pill-text />
      </p>
    </section>
  );
}
