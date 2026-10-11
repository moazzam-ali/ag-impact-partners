"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { DURATION, EASE, MOTION_OK, REDUCED_MOTION, STAGGER } from "@/lib/motion/tokens";
import { armWords } from "@/lib/motion/words";

import { type DocCopy } from "../signataire/documents";
import { geistMono, newsreader } from "../study-fonts";
import { createDossierScene } from "./dossier-scene";
import styles from "./hero-dossier.module.css";

/*
  Hero study "dossier" (direction: Le Dossier, as an object).

  A leather portfolio with the peak mark in peach foil. The cover opens by itself onto the first of
  the five fields; the hero is pinned for three screens and scrolling turns the pages, each curling
  over, through the five fields (brief copy, fixed order) to the signed contract on the last page.
  Reduced motion: open on the first field, one screen tall.
*/

// The peak mark's path (public/brand/mark-charcoal.svg), for the foil on the cover.
const PEAK =
  "M825.29,970.75C824.77,970.06 820.71,963.20 816.28,955.50C808.89,942.68 793.36,915.78 746.74,835.00C737.37,818.77 725.54,798.30 720.44,789.50C715.35,780.70 703.79,760.67 694.76,745.00C685.72,729.33 669.88,701.88 659.54,684.00C649.20,666.12 629.70,632.38 616.21,609.00C602.71,585.62 584.37,553.90 575.46,538.50C566.55,523.10 554.20,501.73 548.01,491.00C507.17,420.16 485.63,383.04 485.47,383.26C485.37,383.39 479.20,394.07 471.77,407.00C464.34,419.93 455.66,435.00 452.47,440.50C445.95,451.76 441.01,460.32 401.08,529.50C385.52,556.45 368.63,585.70 363.53,594.50C335.40,643.08 321.10,667.91 319.62,670.77L317.95,673.99L400.20,674.24L482.44,674.50L490.55,688.50C495.01,696.20 509.17,720.73 522.01,743.00C534.85,765.27 549.93,791.38 555.51,801.00C561.10,810.62 566.21,819.51 566.87,820.75L568.07,823.00L313.60,823.00L59.14,823.00L65.93,811.25C103.41,746.39 142.99,677.83 160.46,647.50C168.07,634.30 179.90,613.83 186.76,602.00C207.57,566.13 213.23,556.35 225.52,535.00C245.78,499.84 265.97,464.88 271.44,455.50C274.33,450.55 283.69,434.35 292.24,419.50C300.79,404.65 315.33,379.45 324.54,363.50C333.75,347.55 346.35,325.73 352.54,315.00C358.73,304.27 367.05,289.88 371.04,283.00C375.02,276.12 381.52,264.88 385.49,258.00C395.15,241.23 413.40,209.65 426.50,187.00C432.38,176.82 448.03,149.70 461.28,126.73C474.52,103.75 485.68,85.30 486.09,85.73C486.49,86.15 497.48,104.95 510.49,127.50C523.51,150.05 537.42,174.12 541.41,181.00C549.61,195.15 550.71,197.04 616.49,311.00C632.84,339.32 651.97,372.40 658.99,384.50C666.02,396.60 675.13,412.35 679.23,419.50C683.33,426.65 691.11,440.15 696.53,449.50C711.31,475.05 728.07,504.07 753.97,549.00C766.82,571.27 782.81,598.95 789.51,610.50C796.21,622.05 807.92,642.30 815.53,655.50C845.84,708.08 862.17,736.39 872.95,755.00C879.15,765.73 888.39,781.70 893.47,790.50C898.55,799.30 908.69,816.85 916.00,829.50C923.31,842.15 935.25,862.85 942.54,875.50C949.84,888.15 959.06,904.12 963.04,911.00C976.33,933.95 993.34,963.45 995.77,967.75L998.17,972.00L912.21,972.00C844.61,972.00 826.04,971.73 825.29,970.75ZM1107.69,864.25C1105.79,861.09 1099.07,849.50 1092.75,838.50C1079.84,816.00 1068.48,796.32 1048.65,762.07L1035.09,738.64L1044.94,728.42C1050.36,722.79 1058.06,713.98 1062.06,708.85C1069.52,699.25 1085.00,676.29 1085.00,674.82C1085.00,674.37 1065.48,674.00 1041.62,674.00C1008.12,674.00 998.02,673.72 997.25,672.75C996.71,672.06 991.99,664.08 986.77,655.00C977.36,638.65 956.39,602.31 945.81,584.00C942.78,578.77 934.46,564.38 927.30,552.00C920.15,539.62 913.76,528.49 913.11,527.25L911.93,525.00L1093.59,525.00L1275.25,525.00L1274.58,541.25C1269.89,654.78 1224.43,759.90 1145.71,839.24C1134.39,850.65 1113.07,870.00 1111.82,870.00C1111.45,870.00 1109.59,867.41 1107.69,864.25ZM1080.04,366.95C1058.23,331.15 1022.39,295.43 984.87,272.09C939.19,243.69 887.81,228.51 834.00,227.54C805.54,227.03 783.65,229.34 757.91,235.57C752.24,236.94 747.12,237.87 746.51,237.64C745.91,237.41 743.02,233.01 740.09,227.86C737.16,222.71 720.42,193.69 702.88,163.37C685.35,133.05 671.00,107.79 671.00,107.23C671.00,105.83 693.43,98.11 712.00,93.11C748.09,83.39 781.02,79.02 822.00,78.49C849.930,78.13 860.24,78.64 883.50,81.53C982.25,93.80 1073.74,138.62 1144.13,209.22C1179.45,244.64 1207.61,284.07 1229.67,329.00C1235.810,341.50 1249.00,372.94 1249.00,375.07C1249.00,375.64 1217.10,375.98 1167.25,375.96L1085.50,375.91L1080.04,366.95Z";

const stripMarks = (body: string) =>
  body.replace(/<k>(.*?)<\/k>/g, "$1").replace(/<e>(.*?)\|.*?<\/e>/g, "$1");

export function HeroDossier() {
  const t = useTranslations("hero");
  const td = useTranslations("heroStudies.dossier");
  const studies = useMessages().heroStudies;
  const articles = studies.redline.contract.articles;
  const contract: DocCopy = {
    title: studies.signataire.docs[0] ?? "",
    ref: studies.signataire.ref,
    between: [studies.signataire.between[0] ?? "", studies.signataire.between[1] ?? ""],
    clauses: articles.slice(0, 3).map((a) => ({ title: a.title, body: stripMarks(a.body) })),
    place: studies.signataire.place,
    parties: [studies.signataire.parties[0] ?? "", studies.signataire.parties[1] ?? ""],
  };
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const [canvas] = q<HTMLCanvasElement>("[data-canvas]");
      const [frameEl] = q<HTMLElement>("[data-frame]");
      if (!canvas || !frameEl) return;
      const words = q<HTMLElement>("[data-title] .word");
      const chrome = q<HTMLElement>("[data-chrome]");
      const css = getComputedStyle(el);
      const token = (name: string) => css.getPropertyValue(name).trim();
      const fonts = { serif: token("--font-newsreader"), mono: token("--font-mono") };
      const reduced = window.matchMedia(REDUCED_MOTION).matches;

      const s = { intro: reduced ? 1 : 0, scroll: 0, p: 0 };
      let scene: ReturnType<typeof createDossierScene> | null = null;
      let visible = true;
      let alive = true;
      const target = () => Math.max(s.intro * 0.12, s.scroll * 0.98);
      const fit = () => {
        scene?.resize(canvas.clientWidth, canvas.clientHeight);
        scene?.frame(s.p);
      };
      const tick = (_t: number, deltaMs: number) => {
        if (!scene || !visible) return;
        const dt = Math.min(0.05, deltaMs / 1000);
        s.p += (target() - s.p) * (1 - Math.exp(-6 * dt));
        scene.frame(s.p);
        frameEl.style.opacity = String(Math.max(0.0, 1 - Math.max(0, s.p - 0.2) * 3));
      };
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        scene?.setPointer(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          ((e.clientY - r.top) / r.height) * 2 - 1,
        );
      };

      const mm = gsap.matchMedia();
      mm.add(REDUCED_MOTION, () => {
        el.dataset.state = "ready";
        s.p = 0.12;
      });
      mm.add(MOTION_OK, () => {
        armWords(el, words);
        gsap.set(chrome, { autoAlpha: 0, y: 8 });
        gsap
          .timeline({ delay: 0.15 })
          .to(words, {
            yPercent: 0,
            duration: DURATION.words,
            stagger: STAGGER.words,
            ease: EASE.words,
          })
          .to(chrome, { autoAlpha: 1, y: 0, duration: DURATION.base, ease: EASE.soft }, 0.4)
          .to(s, { intro: 1, duration: 1.6, ease: "power2.inOut" }, 0.9);
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            s.scroll = self.progress;
          },
        });
      });

      void Promise.all([
        document.fonts.load(`400 58px ${fonts.serif}`),
        document.fonts.load(`300 58px ${fonts.serif}`),
        document.fonts.load(`italic 400 26px ${fonts.serif}`),
        document.fonts.load(`500 19px ${fonts.mono}`),
      ]).then(() => {
        if (!alive) return;
        scene = createDossierScene({
          canvas,
          fonts,
          fields: studies.dossier.fields,
          intro: studies.dossier.intro,
          eyebrow: t("eyebrow"),
          brand: siteConfig.name,
          contract,
          peakPath: PEAK,
          colors: {
            desk: token("--desk"),
            leather: token("--dossier-leather"),
            foil: token("--accent"),
            light: token("--lamp"),
            lining: token("--accent"),
            paper: token("--paper"),
            print: token("--print"),
            soft: token("--print-soft"),
            rule: token("--print-rule"),
            ink: token("--sign-ink"),
          },
        });
        fit();
        el.dataset.scene = "ready";
        if (!reduced) {
          gsap.ticker.add(tick);
          el.addEventListener("pointermove", onMove);
        }
      });

      const resize = new ResizeObserver(fit);
      resize.observe(canvas);
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
      });
      io.observe(el);

      return () => {
        alive = false;
        gsap.ticker.remove(tick);
        el.removeEventListener("pointermove", onMove);
        resize.disconnect();
        io.disconnect();
        scene?.dispose();
        mm.revert();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={cn(styles.hero, newsreader.variable, geistMono.variable)}
      data-theme="dark"
      data-state="pending"
    >
      <div className={styles.sticky}>
        <canvas className={styles.canvas} data-canvas aria-hidden="true" />
        <div className={styles.frame} data-frame>
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
          <p className={styles.hint} data-chrome>
            {td("hint")}
          </p>
        </div>
      </div>
    </section>
  );
}
