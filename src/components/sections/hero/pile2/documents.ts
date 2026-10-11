import * as THREE from "three";

import { PX } from "../signataire/documents";
import { OTHER_HAND, paraphe, signature, strikeStroke } from "../signataire/strokes";

/*
  The five documents of Pile 2, one per field, each a different kind of paper: a contract, an
  annex with a schedule and a stamp, articles in two columns, a term sheet, a page around one
  figure. Real words only where the brief gives them (field names and lines, parties, the stamp, the
  approved figure); everything else is set as grey lines, the way a page reads from a distance.

  Drawn in A4 page pixels (1240 × 1754, as Signataire) onto a smaller canvas.
*/

export type Field = { n: string; title: string; body: string; items: string[] };
export type DocCopy = {
  fields: Field[];
  ref: string;
  between: [string, string];
  parties: [string, string];
  place: string;
  stamp: string;
  figure: { value: string; label: string };
};
export type DocInks = {
  print: string;
  soft: string;
  rule: string;
  ink: string;
  pen: string;
  accent: string;
};

/** Each design's paper, so the documents read as different stock even edge-on in the ream. */
export const PAPERS = ["#f4f0e6", "#e6ebee", "#efebe3", "#f3e9d6", "#fbfaf6"] as const;
export const DESIGNS = PAPERS.length;

const SCALE = 0.7;
const M = 110;
type Point = [number, number];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function printDocuments(
  copy: DocCopy,
  font: string,
  inks: DocInks,
  anisotropy: number,
): THREE.CanvasTexture[] {
  return PAPERS.map((paper, design) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(PX.w * SCALE);
    canvas.height = Math.round(PX.h * SCALE);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, PX.w, PX.h);
    ctx.textBaseline = "alphabetic";
    const field = copy.fields[design] ?? copy.fields[0]!;
    const r = rng(design * 31 + 5);

    const type = (weight: number, size: number, color: string, tracking = 0) => {
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.fillStyle = color;
      ctx.letterSpacing = `${tracking}px`;
    };
    /** Grey lines standing in for text, justified, the last one short. */
    const greek = (x: number, y: number, width: number, rows: number, lead = 34) => {
      ctx.fillStyle = inks.soft;
      ctx.globalAlpha = 0.42;
      for (let i = 0; i < rows; i++) {
        const w = i === rows - 1 ? width * (0.3 + r() * 0.4) : width * (0.94 + r() * 0.06);
        ctx.beginPath();
        ctx.roundRect(x, y + i * lead - 10, w, 11, 5.5);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return y + rows * lead;
    };
    const rule = (x: number, y: number, w: number, h = 2, color = inks.rule) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    const pen = (strokes: Point[][], color: string, width = 4.2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const points of strokes) {
        ctx.beginPath();
        points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
    };
    const paragraph = (text: string, x: number, y: number, width: number, lead: number) => {
      const lines = wrap(ctx, text, width);
      lines.forEach((line, i) => ctx.fillText(line, x, y + i * lead));
      return y + lines.length * lead;
    };
    const signatures = (y: number) => {
      type(500, 18, inks.soft, 2);
      copy.parties.forEach((party, i) => {
        const x = i ? 680 : M;
        ctx.fillText(party.toUpperCase(), x, y);
        rule(x, y + 150, 440);
      });
      pen(signature(M + 30, M + 380, y + 128, 3, OTHER_HAND), inks.print, 3.6);
      pen(signature(700, 1080, y + 126, 7), inks.ink);
    };

    switch (design) {
      // 01 · a contract: field number large in the corner, parties, clauses, two signatures.
      case 0: {
        type(500, 19, inks.soft, 2.4);
        ctx.fillText(copy.ref.toUpperCase(), M, 140);
        rule(M, 164, PX.w - M * 2);
        type(600, 230, inks.rule, -8);
        ctx.textAlign = "right";
        ctx.fillText(field.n, PX.w - M + 8, 380);
        ctx.textAlign = "left";
        type(600, 78, inks.print, -2);
        ctx.fillText(field.title, M, 300);
        type(400, 28, inks.soft);
        paragraph(field.body, M, 356, 640, 38);
        type(400, 27, inks.print);
        let x = M;
        const y0 = 500;
        const word = (w: string) => {
          ctx.fillText(w, x, y0);
          x += ctx.measureText(w).width + 14;
        };
        word(copy.between[0]);
        rule(x, y0 - 21, 250, 26, inks.print);
        x += 264;
        word(copy.between[1]);
        rule(x, y0 - 21, 270, 26, inks.print);
        let y = 590;
        for (let c = 0; c < 3; c++) {
          rule(M, y - 12, 150, 12, inks.soft);
          y = greek(M, y + 40, PX.w - M * 2, 5 - (c % 2)) + 36;
        }
        signatures(1430);
        break;
      }
      // 02 · an annex: a dark band, a schedule of the field's lines, a stamp across it.
      case 1: {
        rule(0, 0, PX.w, 250, inks.print);
        type(600, 30, paper, 1);
        ctx.fillText(field.n, M, 120);
        type(600, 92, paper, -2.5);
        ctx.fillText(field.title, M, 206);
        type(500, 19, inks.soft, 2.4);
        ctx.fillText(copy.ref.toUpperCase(), M, 320);
        type(400, 30, inks.print);
        let y = paragraph(field.body, M, 390, PX.w - M * 2, 40) + 50;
        rule(M, y, PX.w - M * 2, 4, inks.print);
        y += 60;
        const cols = [M, 560, 800, 1000];
        field.items.forEach((item) => {
          type(500, 28, inks.print);
          ctx.fillText(item, cols[0]!, y);
          ctx.fillStyle = inks.soft;
          ctx.globalAlpha = 0.42;
          for (let c = 1; c < cols.length; c++) {
            ctx.beginPath();
            ctx.roundRect(cols[c]!, y - 11, 90 + r() * 80, 11, 5.5);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          rule(M, y + 30, PX.w - M * 2);
          y += 78;
        });
        greek(M, y + 60, PX.w - M * 2, 6);
        // The stamp.
        ctx.save();
        ctx.translate(900, 1430);
        ctx.rotate(-0.21);
        ctx.strokeStyle = inks.pen;
        ctx.globalAlpha = 0.86;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.roundRect(-200, -62, 400, 124, 14);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-186, -48, 372, 96, 8);
        ctx.stroke();
        type(700, 46, inks.pen, 6);
        ctx.textAlign = "center";
        ctx.fillText(copy.stamp.toUpperCase(), 0, 16);
        ctx.restore();
        ctx.textAlign = "left";
        ctx.letterSpacing = "0px";
        pen([paraphe(PX.w - M - 120, 1640)], inks.ink, 3.6);
        break;
      }
      // 03 · articles in two columns, the field's line as a lede with a bar beside it.
      case 2: {
        type(500, 19, inks.soft, 2.4);
        ctx.fillText(copy.ref.toUpperCase(), M, 140);
        ctx.strokeStyle = inks.print;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(PX.w - M - 48, 128, 48, 0, Math.PI * 2);
        ctx.stroke();
        type(600, 40, inks.print, -1);
        ctx.textAlign = "center";
        ctx.fillText(field.n, PX.w - M - 48, 142);
        ctx.textAlign = "left";
        type(600, 104, inks.print, -4);
        ctx.fillText(field.title, M - 6, 320);
        rule(M, 380, 8, 150, inks.accent);
        type(400, 32, inks.print);
        paragraph(field.body, M + 40, 412, 820, 44);
        const colW = (PX.w - M * 2 - 60) / 2;
        let y = 640;
        field.items.forEach((item, i) => {
          type(600, 26, inks.print);
          ctx.fillText(`${i + 1}. ${item}`, M, y);
          y = greek(M, y + 44, colW, 5) + 40;
        });
        y = 640;
        for (let i = 0; i < 3; i++) {
          rule(M + colW + 60, y - 12, 120, 12, inks.soft);
          y = greek(M + colW + 60, y + 44, colW, 6) + 40;
        }
        signatures(1450);
        break;
      }
      // 04 · a term sheet: the field's lines with dotted leaders, one row highlighted.
      case 3: {
        rule(M, 110, 70, 70, inks.print);
        type(600, 36, paper, -1);
        ctx.textAlign = "center";
        ctx.fillText(field.n, M + 35, 158);
        ctx.textAlign = "left";
        type(500, 19, inks.soft, 2.4);
        ctx.fillText(copy.ref.toUpperCase(), M + 100, 156);
        type(600, 120, inks.print, -5);
        ctx.fillText(field.title, M - 6, 330);
        type(400, 30, inks.soft);
        let y = paragraph(field.body, M, 400, PX.w - M * 2, 40) + 70;
        field.items.forEach((item, i) => {
          if (i === 1) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = inks.accent;
            ctx.beginPath();
            ctx.moveTo(M - 14, y - 34);
            ctx.lineTo(M + 420, y - 40);
            ctx.lineTo(M + 424, y + 10);
            ctx.lineTo(M - 10, y + 14);
            ctx.fill();
            ctx.restore();
          }
          type(500, 30, inks.print);
          ctx.fillText(item, M, y);
          const end = M + ctx.measureText(item).width + 20;
          ctx.fillStyle = inks.soft;
          for (let dx = end; dx < 900; dx += 14) ctx.fillRect(dx, y - 4, 4, 4);
          ctx.globalAlpha = 0.42;
          ctx.beginPath();
          ctx.roundRect(920, y - 11, 120 + r() * 90, 11, 5.5);
          ctx.fill();
          ctx.globalAlpha = 1;
          y += 74;
        });
        rule(M, y, PX.w - M * 2);
        greek(M, y + 70, PX.w - M * 2, 7);
        rule(680, 1650, 440);
        type(500, 18, inks.soft, 2);
        ctx.fillText(copy.parties[1].toUpperCase(), 680, 1500);
        pen(signature(700, 1080, 1624, 11), inks.ink);
        pen([paraphe(M + 60, 1600)], inks.print, 3.6);
        break;
      }
      // 05 · one figure: the approved savings range, a falling chart, a struck line.
      default: {
        type(500, 19, inks.soft, 2.4);
        ctx.fillText(`${field.n} · ${copy.ref}`.toUpperCase(), M, 140);
        rule(M, 164, PX.w - M * 2, 2, inks.print);
        type(600, 64, inks.print, -2);
        paragraph(field.title, M, 260, 900, 70);
        type(600, 210, inks.print, -9);
        ctx.fillText(copy.figure.value, M - 8, 620);
        type(400, 32, inks.soft);
        paragraph(copy.figure.label, M, 690, 760, 42);
        const bars = [1, 0.93, 0.86, 0.8, 0.74, 0.7];
        bars.forEach((h, i) => {
          ctx.fillStyle = i === bars.length - 1 ? inks.accent : inks.rule;
          const bh = 260 * h;
          ctx.fillRect(M + i * 78, 1080 - bh, 52, bh);
        });
        rule(M, 1082, 470, 3, inks.print);
        greek(660, 840, 470, 7);
        greek(M, 1170, PX.w - M * 2, 5);
        pen([strikeStroke(M + 180, M + 620, 1170 + 34 * 2 - 6)], inks.pen, 4);
        pen([paraphe(PX.w - M + 20, 1170 + 34 * 2 - 4)], inks.pen, 3.4);
        rule(680, 1650, 440);
        type(500, 18, inks.soft, 2);
        ctx.fillText(copy.parties[0].toUpperCase(), 680, 1500);
        pen(signature(700, 1080, 1624, 5), inks.ink);
        break;
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    return texture;
  });
}
