"use client";

import { useMessages, useTranslations } from "next-intl";
import { Fragment, useRef } from "react";

import { cn } from "@/lib/cn";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { EASE, MOTION_OK, REDUCED_MOTION } from "@/lib/motion/tokens";

import { geistMono, newsreader } from "../study-fonts";
import { parseContract, type ContractMessages, type Token } from "./contract";
import styles from "./hero-redline.module.css";
import { caretPath, strikePath, underlinePath } from "./strokes";

/*
  Hero study "redline" (direction: Le Dossier, the site is a contract).

  The page opens on a contract lying on the table. A red pen makes one edit by hand, then every
  clause is struck in one wave spreading from where the pen lifted, except a few words left standing
  across the page. Read in order they are the headline; they lift out of the contract and set
  themselves large, and the pen underlines "signature". Afterwards the struck contract stays as the
  texture of the hero: rest on a clause to lift its strikes and read the original (the headline
  steps back meanwhile). The pen follows the cursor.

  Geometry is measured once fonts are ready, with the sheet flat, in the sheet's pixel space; strikes
  are SVG paths drawn with DrawSVG. The whole intro is one timeline built from that layout.
*/

const SVG_NS = "http://www.w3.org/2000/svg";

/** The edit the pen makes by hand (indices into the contract's edits); the rest land in the wave. */
const PEN_EDITS = [1];

/** Text opacity once struck, while the headline is still in the page. */
const STRUCK = 0.34;
/** Settled state, once the headline has lifted out. */
const FADED = { text: 0.15, strike: 0.42, note: 0.32 };
/** A hovered clause, read back. */
const READ = 0.8;

type Mark = {
  x1: number;
  x2: number;
  y: number;
  top: number;
  h: number;
  article: number;
  edit: number | null;
  el: HTMLElement;
  path: SVGPathElement;
};
type Note = {
  index: number;
  el: HTMLElement;
  caret: SVGPathElement;
  x1: number;
  x2: number;
  y: number;
};
type Flight = {
  word: HTMLElement;
  keep: HTMLElement | null;
  dx: number;
  dy: number;
  scale: number;
};
type Layout = {
  marks: Mark[];
  notes: Note[];
  flights: Flight[];
  underline: { x1: number; x2: number; y: number; size: number } | null;
};

export function HeroRedline() {
  const t = useTranslations("hero");
  const tr = useTranslations("heroStudies.redline");
  // Read raw: the article bodies carry <k> / <e> marks that ICU must not see.
  const contract: ContractMessages = useMessages().heroStudies.redline.contract;
  const { articles, edits } = parseContract(contract.articles);
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const el = root.current;
      const safe = contextSafe;
      if (!el || !safe) return;
      const q = gsap.utils.selector(el);
      const [sheet] = q<HTMLElement>("[data-sheet]");
      const [page] = q<HTMLElement>("[data-page]");
      const [strikes] = q<SVGSVGElement>("[data-strikes]");
      const [ink] = q<SVGPathElement>("[data-underline]");
      const [pen] = q<HTMLElement>("[data-pen]");
      const [eyebrow] = q<HTMLElement>("[data-eyebrow]");
      const [hint] = q<HTMLElement>("[data-hint]");
      const [headline] = q<HTMLElement>("[data-headline]");
      if (!sheet || !page || !strikes || !ink || !pen || !eyebrow || !hint || !headline) return;
      const words = q<HTMLElement>("[data-hw]");
      const keeps = q<HTMLElement>("[data-keep]");
      const noteEls = q<HTMLElement>("[data-ins]");
      const textEls = q<HTMLElement>("[data-run],[data-edit],[data-fade]");
      const articleEls = q<HTMLElement>("[data-article]");
      const fineHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      let alive = true;

      const fontSize = (node: Element) => parseFloat(getComputedStyle(node).fontSize);

      /* ---- Layout: measured flat, in the sheet's pixel space ------------------------------ */
      const layout = (): Layout => {
        const saved = sheet.style.transform;
        sheet.style.transform = "none";
        try {
          const origin = sheet.getBoundingClientRect();
          strikes.replaceChildren();

          const marks: Mark[] = [];
          let seed = 1;
          page.querySelectorAll<HTMLElement>("[data-run],[data-edit]").forEach((node) => {
            const article = Number(
              node.closest<HTMLElement>("[data-article]")?.dataset.article ?? -1,
            );
            const edit = node.dataset.edit === undefined ? null : Number(node.dataset.edit);
            for (const r of node.getClientRects()) {
              if (r.width < 3) continue;
              const top = r.top - origin.top;
              const x1 = r.left - origin.left;
              const x2 = r.right - origin.left;
              const y = top + r.height * 0.56;
              const path = document.createElementNS(SVG_NS, "path");
              path.setAttribute("d", strikePath(x1, x2, y, r.height, seed++));
              path.dataset.article = String(article);
              strikes.appendChild(path);
              marks.push({ x1, x2, y, top, h: r.height, article, edit, el: node, path });
            }
          });

          const notes: Note[] = [];
          noteEls.forEach((node) => {
            const index = Number(node.dataset.ins);
            const parts = marks.filter((m) => m.edit === index);
            const first = parts[0];
            const last = parts.at(-1);
            if (!first || !last) return;
            const top = first.top + first.h * 0.12;
            node.style.left = `${first.x1}px`;
            node.style.top = `${top}px`;
            const caret = document.createElementNS(SVG_NS, "path");
            caret.setAttribute("d", caretPath(last.x2 + 3, last.top + last.h * 0.86, last.h));
            caret.dataset.article = String(first.article);
            strikes.appendChild(caret);
            notes.push({
              index,
              el: node,
              caret,
              x1: first.x1,
              x2: first.x1 + node.offsetWidth,
              y: top - node.offsetHeight * 0.28,
            });
          });

          const flights = words.map((word, i): Flight => {
            const keep = keeps[i] ?? null;
            if (!keep) return { word, keep, dx: 0, dy: 0, scale: 1 };
            const k = keep.getBoundingClientRect();
            const w = word.getBoundingClientRect();
            return {
              word,
              keep,
              dx: k.left - w.left,
              dy: k.top + k.height / 2 - (w.top + w.height / 2),
              scale: fontSize(keep) / fontSize(word),
            };
          });

          let underline: Layout["underline"] = null;
          const lastWord = words.at(-1);
          if (lastWord) {
            const w = lastWord.getBoundingClientRect();
            const size = fontSize(lastWord);
            underline = {
              x1: w.left - origin.left,
              x2: w.right - origin.left,
              y: w.bottom - origin.top - size * 0.1,
              size,
            };
            ink.setAttribute("d", underlinePath(underline.x1, underline.x2, underline.y, size));
          }

          return { marks, notes, flights, underline };
        } finally {
          sheet.style.transform = saved;
        }
      };

      /* ---- The settled page (reduced motion, resize, end of intro) ------------------------ */
      const settled = (L: Layout) => {
        gsap.set(sheet, { autoAlpha: 1 });
        gsap.set(
          L.marks.map((m) => m.path),
          { drawSVG: "100%", opacity: FADED.strike },
        );
        gsap.set(
          L.notes.map((n) => n.caret),
          { drawSVG: "100%", opacity: FADED.strike },
        );
        gsap.set(
          L.notes.map((n) => n.el),
          { clipPath: "inset(-30% 0% -30% 0%)", opacity: FADED.note },
        );
        gsap.set(textEls, { opacity: FADED.text });
        gsap.set(keeps, { autoAlpha: 0 });
        gsap.set(words, { autoAlpha: 1, x: 0, y: 0, scale: 1 });
        gsap.set(ink, { drawSVG: "100%", opacity: 1 });
        gsap.set([eyebrow, hint], { autoAlpha: 1, y: 0 });
        gsap.set(headline, { opacity: 1 });
      };

      /* ---- Pen ----------------------------------------------------------------------------- */
      const setPenX = gsap.quickSetter(pen, "x", "px");
      const setPenY = gsap.quickSetter(pen, "y", "px");
      const pos = { x: 0, y: 0 };
      const movePen = () => {
        setPenX(pos.x);
        setPenY(pos.y);
      };
      /** A DrawSVG tween whose pen rides the tip of the line. */
      const drawWithPen = (path: SVGPathElement, duration: number, ease: string) => {
        const len = path.getTotalLength();
        const tween = gsap.fromTo(
          path,
          { drawSVG: "0%", opacity: 1 },
          {
            drawSVG: "100%",
            duration,
            ease,
            immediateRender: false,
            onUpdate: () => {
              const p = path.getPointAtLength(len * tween.ratio);
              pos.x = p.x;
              pos.y = p.y;
              movePen();
            },
          },
        );
        return tween;
      };

      /* ---- Interaction once settled -------------------------------------------------------- */
      // Rest on a clause (a short hover intent, so passing over the page does nothing) and its
      // strikes lift so it can be read; the headline steps back meanwhile.
      const articleParts = (node: HTMLElement) => {
        const a = node.dataset.article ?? "";
        return {
          paths: strikes.querySelectorAll<SVGPathElement>(`path[data-article="${a}"]`),
          text: node.querySelectorAll<HTMLElement>("[data-run],[data-edit]"),
          notes: page.querySelectorAll<HTMLElement>(`[data-ins][data-article="${a}"]`),
        };
      };
      const tweenAll = (targets: ArrayLike<Element>, vars: gsap.TweenVars) => {
        if (targets.length) gsap.to(targets, { ...vars, overwrite: true });
      };
      const front = [headline, eyebrow, ink];
      let reading: HTMLElement | null = null;
      let intent: gsap.core.Tween | null = null;

      const read = safe((node: HTMLElement) => {
        reading = node;
        const { paths, text, notes } = articleParts(node);
        tweenAll(paths, { drawSVG: "100% 100%", duration: 0.45, ease: EASE.out, stagger: 0.012 });
        tweenAll(text, { opacity: READ, duration: 0.4, ease: EASE.soft });
        tweenAll(notes, { opacity: 0, duration: 0.25 });
        tweenAll(front, { opacity: 0.1, duration: 0.45, ease: EASE.soft });
      });
      const unread = safe((node: HTMLElement) => {
        const { paths, text, notes } = articleParts(node);
        if (paths.length) {
          gsap.fromTo(
            paths,
            { drawSVG: "0% 0%" },
            {
              drawSVG: "0% 100%",
              duration: 0.5,
              ease: EASE.inOut,
              stagger: 0.012,
              overwrite: true,
            },
          );
        }
        tweenAll(text, { opacity: FADED.text, duration: 0.5, ease: EASE.soft });
        tweenAll(notes, { opacity: FADED.note, duration: 0.4, delay: 0.3 });
        // Delayed, so moving straight onto the next clause doesn't flash the headline.
        tweenAll(front, { opacity: 1, duration: 0.5, ease: EASE.soft, delay: 0.3 });
      });
      const readClause = safe((e: PointerEvent) => {
        const node = e.currentTarget as HTMLElement;
        intent?.kill();
        intent = gsap.delayedCall(0.35, () => read(node));
      });
      const strikeClause = safe((e: PointerEvent) => {
        const node = e.currentTarget as HTMLElement;
        intent?.kill();
        intent = null;
        if (reading !== node) return;
        reading = null;
        unread(node);
      });
      const penX = gsap.quickTo(pen, "x", { duration: 0.22, ease: EASE.out });
      const penY = gsap.quickTo(pen, "y", { duration: 0.22, ease: EASE.out });
      const followPointer = safe((e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const r = sheet.getBoundingClientRect();
        penX(e.clientX - r.left);
        penY(e.clientY - r.top);
        gsap.to(pen, { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
      });
      const hidePen = safe(() => {
        gsap.to(pen, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
      });

      let interactive = false;
      const enableInteraction = () => {
        if (interactive) return;
        interactive = true;
        el.dataset.phase = "done";
        articleEls.forEach((node) => {
          node.addEventListener("pointerenter", readClause);
          node.addEventListener("pointerleave", strikeClause);
        });
        if (fineHover) {
          el.addEventListener("pointermove", followPointer);
          el.addEventListener("pointerleave", hidePen);
        }
      };

      /* ---- Intro --------------------------------------------------------------------------- */
      let resizedDuringIntro = false;

      const play = (L: Layout) => {
        gsap.set(
          L.marks.map((m) => m.path),
          { drawSVG: "0%", opacity: 0 },
        );
        gsap.set(
          L.notes.map((n) => n.caret),
          { drawSVG: "0%", opacity: 0 },
        );
        gsap.set(
          L.notes.map((n) => n.el),
          { clipPath: "inset(-30% 100% -30% 0%)" },
        );
        gsap.set(ink, { drawSVG: "0%", opacity: 0 });

        const tl = gsap.timeline({
          onComplete: () => {
            if (resizedDuringIntro) settled(layout());
            enableInteraction();
          },
        });

        // The sheet comes up off the table.
        tl.to(sheet, { autoAlpha: 1, duration: 0.9, ease: EASE.soft }, 0).to(
          sheet,
          { rotateX: 0, rotateZ: 0, scale: 1, yPercent: 0, duration: 2.6, ease: EASE.inOut },
          0,
        );

        // 1. The pen's own edits: strike, then write the new term in above.
        let at = 0.55;
        const penMarks = L.marks.filter((m) => m.edit !== null && PEN_EDITS.includes(m.edit));
        const start = penMarks[0];
        if (start) {
          pos.x = start.x1 - 60;
          pos.y = start.y + 50;
          movePen();
        }
        tl.to(pen, { autoAlpha: 1, duration: 0.3, ease: EASE.soft }, at - 0.25);

        let lift = { x: 0, y: 0 };
        for (const index of PEN_EDITS) {
          const parts = L.marks.filter((m) => m.edit === index);
          const note = L.notes.find((n) => n.index === index);
          const first = parts[0];
          if (!first || !note) continue;

          tl.to(
            pos,
            { x: first.x1, y: first.y, duration: 0.24, ease: EASE.inOut, onUpdate: movePen },
            at,
          );
          at += 0.24;
          for (const m of parts) {
            const dur = 0.1 + (m.x2 - m.x1) / 1500;
            tl.add(drawWithPen(m.path, dur, "power1.inOut"), at);
            at += dur;
          }
          tl.to(first.el, { opacity: STRUCK, duration: 0.3, ease: EASE.soft }, at - 0.1);

          tl.to(
            pos,
            { x: note.x1, y: note.y, duration: 0.14, ease: EASE.inOut, onUpdate: movePen },
            at,
          );
          at += 0.14;
          const write = 0.12 + (note.x2 - note.x1) / 600;
          tl.to(
            note.el,
            { clipPath: "inset(-30% 0% -30% 0%)", duration: write, ease: "none" },
            at,
          ).to(pos, { x: note.x2, duration: write, ease: "none", onUpdate: movePen }, at);
          at += write;
          tl.fromTo(
            note.caret,
            { drawSVG: "0%", opacity: 1 },
            { drawSVG: "100%", duration: 0.12, ease: "none", immediateRender: false },
            at,
          );
          at += 0.08;
          lift = { x: note.x2, y: note.y };
        }
        tl.to(pen, { autoAlpha: 0, y: "-=24", duration: 0.35, ease: EASE.soft }, at);

        // 2. The wave: everything else is struck, spreading out from where the pen lifted.
        const waveAt = at + 0.05;
        const WAVE = 0.85;
        const rest = L.marks.filter((m) => !penMarks.includes(m));
        const dist = rest.map((m) => Math.hypot((m.x1 + m.x2) / 2 - lift.x, m.y - lift.y));
        const far = Math.max(1, ...dist);
        const struckAt = new Map<HTMLElement, number>();
        rest.forEach((m, i) => {
          const d = waveAt + ((dist[i] ?? 0) / far) * WAVE;
          tl.fromTo(
            m.path,
            { drawSVG: "0%", opacity: 1 },
            { drawSVG: "100%", duration: 0.3, ease: EASE.out, immediateRender: false },
            d,
          );
          struckAt.set(m.el, Math.min(struckAt.get(m.el) ?? Infinity, d));
        });
        struckAt.forEach((d, node) => {
          tl.to(node, { opacity: STRUCK, duration: 0.4, ease: EASE.soft }, d + 0.08);
        });
        L.notes
          .filter((n) => !PEN_EDITS.includes(n.index))
          .forEach((n) => {
            const struck = L.marks.find((m) => m.edit === n.index);
            const when = (struck ? (struckAt.get(struck.el) ?? waveAt) : waveAt) + 0.25;
            tl.to(n.el, { clipPath: "inset(-30% 0% -30% 0%)", duration: 0.35, ease: "none" }, when);
            tl.fromTo(
              n.caret,
              { drawSVG: "0%", opacity: 1 },
              { drawSVG: "100%", duration: 0.12, ease: "none", immediateRender: false },
              when + 0.3,
            );
          });
        tl.to(q("[data-fade]"), { opacity: STRUCK, duration: 0.5, ease: EASE.soft }, waveAt + 0.3);

        // 3. The kept words hold for a beat, then lift out and set themselves as the headline.
        const flyAt = waveAt + WAVE + 0.4;
        tl.to(
          L.marks.map((m) => m.path),
          { opacity: FADED.strike, duration: 1, ease: EASE.soft },
          flyAt,
        )
          .to(
            L.notes.map((n) => n.caret),
            { opacity: FADED.strike, duration: 1, ease: EASE.soft },
            flyAt,
          )
          .to(textEls, { opacity: FADED.text, duration: 1, ease: EASE.soft }, flyAt)
          .to(
            L.notes.map((n) => n.el),
            { opacity: FADED.note, duration: 1, ease: EASE.soft },
            flyAt,
          );
        L.flights.forEach((f, i) => {
          const d = flyAt + i * 0.07;
          if (f.keep) tl.set(f.keep, { autoAlpha: 0 }, d);
          tl.fromTo(
            f.word,
            { x: f.dx, y: f.dy, scale: f.scale, autoAlpha: 1 },
            {
              x: 0,
              y: 0,
              scale: 1,
              duration: 1.2,
              ease: "expo.inOut",
              immediateRender: false,
            },
            d,
          );
        });
        const landed = flyAt + 1.2 + L.flights.length * 0.07;
        tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE.out }, landed - 0.4);

        // 4. The pen comes back and underlines "signature".
        if (L.underline) {
          const { x1, y } = L.underline;
          tl.call(
            () => {
              pos.x = x1 - 30;
              pos.y = y - 70;
              movePen();
            },
            [],
            landed - 0.45,
          );
          tl.to(pen, { autoAlpha: 1, duration: 0.25, ease: EASE.soft }, landed - 0.45).to(
            pos,
            { x: x1, y, duration: 0.4, ease: EASE.inOut, onUpdate: movePen },
            landed - 0.4,
          );
          tl.add(drawWithPen(ink, 0.6, "power2.inOut"), landed);
          tl.to(pen, { autoAlpha: 0, duration: 0.35, ease: EASE.soft }, landed + 0.75);
        }
        tl.to(hint, { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE.soft }, landed + 0.9);
      };

      const mm = gsap.matchMedia();

      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        gsap.set(pen, { autoAlpha: 0 });
        void document.fonts.ready.then(
          safe(() => {
            if (!alive) return;
            settled(layout());
            enableInteraction();
          }),
        );
      });

      mm.add(MOTION_OK, () => {
        el.dataset.state = "ready";
        gsap.set(sheet, {
          autoAlpha: 0,
          rotateX: 34,
          rotateZ: -6,
          scale: 1.18,
          yPercent: 5,
          transformOrigin: "50% 38%",
        });
        gsap.set(words, { autoAlpha: 0, transformOrigin: "0% 50%" });
        gsap.set([eyebrow, hint], { autoAlpha: 0, y: 10 });
        gsap.set(pen, { autoAlpha: 0 });
        void document.fonts.ready.then(
          safe(() => {
            if (alive) play(layout());
          }),
        );
      });

      // After a resize the measured layout is stale: rebuild the settled page.
      let timer = 0;
      const resize = new ResizeObserver(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(
          safe(() => {
            if (!alive) return;
            if (interactive) settled(layout());
            else resizedDuringIntro = true;
          }),
          160,
        );
      });
      resize.observe(el);

      return () => {
        alive = false;
        window.clearTimeout(timer);
        resize.disconnect();
        articleEls.forEach((node) => {
          node.removeEventListener("pointerenter", readClause);
          node.removeEventListener("pointerleave", strikeClause);
        });
        el.removeEventListener("pointermove", followPointer);
        el.removeEventListener("pointerleave", hidePen);
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
      <div className={styles.sheet} data-sheet>
        <div className={styles.page} data-page aria-hidden="true">
          <div className={styles.doc}>
            <div className={styles.docHead} data-fade>
              <span data-run>{contract.title}</span>
              <span data-run>{contract.draft}</span>
            </div>
            <div className={styles.columns}>
              {articles.map((article, i) => (
                <div key={article.title} className={styles.article} data-article={i}>
                  <p className={styles.articleTitle}>
                    <span data-run>{article.title}</span>
                  </p>
                  <p className={styles.body}>
                    {article.tokens.map((token, j) => (
                      <ContractToken key={j} token={token} />
                    ))}
                  </p>
                </div>
              ))}
              <div className={styles.closing}>
                <p>
                  <span data-run>{contract.closing}</span>
                </p>
                <div className={styles.signatories}>
                  {contract.signatories.map((name) => (
                    <p key={name} className={styles.signatory} data-fade>
                      <span data-run>{name}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <svg className={styles.strikes} data-strikes />
          <div className={styles.notes}>
            {edits.map((edit) => (
              <span
                key={edit.index}
                className={styles.note}
                data-ins={edit.index}
                data-article={edit.article}
              >
                {edit.after}
              </span>
            ))}
          </div>
        </div>
        <svg className={styles.ink} aria-hidden="true">
          <path data-underline />
        </svg>
        <div className={styles.pen} data-pen aria-hidden="true">
          <svg viewBox="0 0 80 80" width="80" height="80" className={styles.penArt}>
            <path d="M24 56 L76 4" className={styles.penBarrel} />
            <path d="M13 67 L24 56" className={styles.penGrip} />
            <path d="M2 78 L9 63 L17 71 Z" className={styles.penNib} />
          </svg>
        </div>
      </div>

      <div className={styles.titleWrap}>
        <p className={styles.eyebrow} data-eyebrow>
          {t("eyebrow")}
        </p>
        <h1 className={styles.headline} data-headline>
          <span className={styles.line}>
            <HeadlineWords text={t("title1")} />
          </span>{" "}
          <span className={styles.line}>
            <HeadlineWords text={t("title2")} />
          </span>
        </h1>
      </div>

      <p className={styles.hint} data-hint>
        {tr("hint")}
      </p>
    </section>
  );
}

/** One token of an article body. Runs keep their outer spaces outside the span, so strikes stop at the words. */
function ContractToken({ token }: { token: Token }) {
  if (token.kind === "keep") {
    return (
      <span className={styles.keep} data-keep>
        {token.text}
      </span>
    );
  }
  if (token.kind === "edit") {
    return <span data-edit={token.index}>{token.before}</span>;
  }
  const [, lead = "", core = "", trail = ""] = /^(\s*)([\s\S]*?)(\s*)$/.exec(token.text) ?? [];
  if (!core) return <>{token.text}</>;
  return (
    <>
      {lead}
      <span data-run>{core}</span>
      {trail}
    </>
  );
}

function HeadlineWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className={styles.word} data-hw>
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
