import * as THREE from "three";

/*
  The documents for Signataire. Each is an A4 plane whose texture is a printed contract drawn once on
  a 2D canvas. Ink is not painted into that texture (re-uploading it every frame is expensive):
  each pen stroke is a ribbon mesh lying just above the page, revealed with a draw range as the pen
  moves.

  Page coordinates are canvas pixels (1240 × 1754, A4 at 150 dpi), y down; `toLocal` maps them to
  the plane in metres.
*/
export const PAGE = { w: 0.21, h: 0.297 } as const;
export const PX = { w: 1240, h: 1754 } as const;
const M = 120; // page margin, px

export type DocCopy = {
  title: string;
  ref: string;
  between: [string, string];
  clauses: { title: string; body: string }[];
  place: string;
  parties: [string, string];
};
export type Fonts = { serif: string; mono: string };
export type Palette = { paper: string; print: string; soft: string; rule: string; ink: string };

/** Where the pen works on a printed page, in page pixels. */
export type PageMarks = {
  strike: { x1: number; x2: number; y: number };
  margin: { x: number; y: number };
  sign: { x1: number; x2: number; y: number };
};

type Point = [number, number];

export function toLocal([x, y]: Point, lift = 0.0004) {
  return new THREE.Vector3((x / PX.w - 0.5) * PAGE.w, (0.5 - y / PX.h) * PAGE.h, lift);
}

/** Draws one line of words justified to `width`, returning each word's box. */
function justified(
  ctx: CanvasRenderingContext2D,
  words: string[],
  x: number,
  y: number,
  width: number,
  last: boolean,
) {
  const widths = words.map((w) => ctx.measureText(w).width);
  const used = widths.reduce((a, b) => a + b, 0);
  const space = ctx.measureText(" ").width;
  const gap = last || words.length < 2 ? space : (width - used) / (words.length - 1);
  const boxes: { x1: number; x2: number }[] = [];
  let cx = x;
  words.forEach((word, i) => {
    ctx.fillText(word, cx, y);
    boxes.push({ x1: cx, x2: cx + (widths[i] ?? 0) });
    cx += (widths[i] ?? 0) + gap;
  });
  return boxes;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[][] = [];
  let line: string[] = [];
  for (const word of text.split(/\s+/)) {
    const next = [...line, word];
    if (line.length && ctx.measureText(next.join(" ")).width > width) {
      lines.push(line);
      line = [word];
    } else {
      line = next;
    }
  }
  if (line.length) lines.push(line);
  return lines;
}

export class PaperDoc {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private canvas = document.createElement("canvas");
  private texture: THREE.CanvasTexture;
  private ribbons: THREE.Mesh[] = [];

  constructor(anisotropy: number) {
    this.canvas.width = PX.w;
    this.canvas.height = PX.h;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = anisotropy;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(PAGE.w, PAGE.h),
      new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.86 }),
    );
    this.mesh.rotation.order = "YXZ";
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  /** Prints a contract on the page and returns where the pen should work. */
  print(copy: DocCopy, fonts: Fonts, palette: Palette): PageMarks {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2d context");
    const width = PX.w - M * 2;
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, PX.w, PX.h);
    ctx.textBaseline = "alphabetic";

    // Header
    ctx.fillStyle = palette.soft;
    ctx.font = `500 19px ${fonts.mono}`;
    ctx.fillText(copy.ref.toUpperCase(), M, 150);
    ctx.fillStyle = palette.rule;
    ctx.fillRect(M, 172, width, 2);
    ctx.fillStyle = palette.print;
    ctx.font = `400 58px ${fonts.serif}`;
    ctx.fillText(copy.title, M, 262);

    // Parties, names withheld
    ctx.font = `400 27px ${fonts.serif}`;
    let x = M;
    const y0 = 330;
    const bar = (w: number) => {
      ctx.fillStyle = palette.print;
      ctx.fillRect(x, y0 - 21, w, 26);
      x += w + 12;
    };
    const word = (w: string) => {
      ctx.fillStyle = palette.print;
      ctx.fillText(w, x, y0);
      x += ctx.measureText(w).width + 12;
    };
    word(copy.between[0]);
    bar(230);
    word(copy.between[1]);
    bar(270);

    // Clauses, justified; remember every line so one phrase can be struck
    let y = 420;
    const lines: { y: number; boxes: { x1: number; x2: number }[] }[] = [];
    for (const clause of copy.clauses) {
      if (y > 1300) break;
      ctx.fillStyle = palette.soft;
      ctx.font = `500 17px ${fonts.mono}`;
      ctx.fillText(clause.title.toUpperCase(), M, y);
      y += 38;
      ctx.fillStyle = palette.print;
      ctx.font = `400 25px ${fonts.serif}`;
      const rows = wrap(ctx, clause.body, width);
      rows.forEach((row, i) => {
        if (y > 1340) return;
        lines.push({ y, boxes: justified(ctx, row, M, y, width, i === rows.length - 1) });
        y += 37;
      });
      y += 30;
    }

    // Signature block
    ctx.font = `italic 400 26px ${fonts.serif}`;
    ctx.fillStyle = palette.print;
    ctx.fillText(copy.place, M, 1450);
    const col = [M, 700] as const;
    const line = { w: 420, y: 1650 };
    ctx.font = `500 17px ${fonts.mono}`;
    copy.parties.forEach((party, i) => {
      ctx.fillStyle = palette.soft;
      ctx.fillText(party.toUpperCase(), col[i] ?? M, 1520);
      ctx.fillStyle = palette.rule;
      ctx.fillRect(col[i] ?? M, line.y, line.w, 2);
    });
    this.texture.needsUpdate = true;

    // The phrase to strike: a few words in the middle of the second clause's second line.
    const target = lines[Math.min(lines.length - 1, 6)] ?? lines[0];
    const boxes = target?.boxes ?? [{ x1: M, x2: M + 200 }];
    const from = boxes[Math.min(2, boxes.length - 1)] ?? boxes[0];
    const to = boxes[Math.min(5, boxes.length - 1)] ?? from;
    return {
      strike: { x1: from?.x1 ?? M, x2: to?.x2 ?? M + 200, y: (target?.y ?? 600) - 8 },
      margin: { x: PX.w - M + 34, y: (target?.y ?? 600) - 6 },
      sign: { x1: 720, x2: 1100, y: line.y - 26 },
    };
  }

  /** Replaces the page's ink with these strokes (page pixels), all hidden until revealed. */
  setStrokes(strokes: Point[][], color: string, width = 0.00105) {
    for (const ribbon of this.ribbons) {
      this.mesh.remove(ribbon);
      ribbon.geometry.dispose();
    }
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.94 });
    this.ribbons = strokes.map((points) => {
      const mesh = new THREE.Mesh(ribbon(points, width), material);
      mesh.geometry.setDrawRange(0, 0);
      this.mesh.add(mesh);
      return mesh;
    });
  }

  /** Reveals stroke `i` up to `progress` (0–1). */
  reveal(i: number, progress: number) {
    const mesh = this.ribbons[i];
    if (!mesh) return;
    const segments = (mesh.geometry.getAttribute("position").count / 2 - 1) | 0;
    mesh.geometry.setDrawRange(0, Math.round(segments * Math.min(1, Math.max(0, progress))) * 6);
  }
}

/** A flat ribbon along a page-pixel polyline: thicker on downstrokes, like a fountain pen. */
function ribbon(points: Point[], width: number) {
  const n = points.length;
  const position = new Float32Array(n * 2 * 3);
  const index: number[] = [];
  const local = points.map((p) => toLocal(p));
  let w = width;
  for (let i = 0; i < n; i++) {
    const prev = local[Math.max(0, i - 1)] ?? local[0]!;
    const next = local[Math.min(n - 1, i + 1)] ?? local[n - 1]!;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    // Downstroke on the page = y decreasing in local space.
    const target = width * (dy < 0 ? 1.2 : 0.72);
    w += (target - w) * 0.25;
    const nx = (-dy / len) * (w / 2);
    const ny = (dx / len) * (w / 2);
    const p = local[i]!;
    position.set([p.x + nx, p.y + ny, p.z, p.x - nx, p.y - ny, p.z], i * 6);
    if (i < n - 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setIndex(index);
  return geometry;
}
