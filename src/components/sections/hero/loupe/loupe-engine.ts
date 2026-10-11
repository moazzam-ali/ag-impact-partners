/*
  Loupe's renderer (canvas 2D). The headline is set huge and its letterforms are filled with fine
  print: rows of contract clauses drifting slowly sideways, clipped to the glyphs. A round loupe
  magnifies what is under it; inside it the fine print is set again at its magnified size, so it is
  sharp and can actually be read.

  Layers (all in device pixels): `mask` (the headline glyphs), `rows` (every row of fine print,
  pre-set twice as wide as the page so it can drift), `work` (rows clipped to the mask this frame),
  `lens` (the magnified view).
*/
export type LoupeOptions = {
  rows: string[];
  text: string;
  fonts: { display: string; micro: string };
  colors: { ink: string; faint: string };
};

export type Lens = { x: number; y: number; r: number; on: number };

const MICRO = 7.5; // fine print size, CSS px
const LEADING = 1.22;
const ZOOM = 3.2;

const canvas2d = () => {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2d context");
  return [c, ctx] as const;
};

export function createLoupe(view: HTMLCanvasElement, options: LoupeOptions) {
  const ctx = view.getContext("2d");
  if (!ctx) throw new Error("2d context");
  const [mask, maskCtx] = canvas2d();
  const [faint, faintCtx] = canvas2d();
  const [strip, stripCtx] = canvas2d();
  const [work, workCtx] = canvas2d();
  const [lens, lensCtx] = canvas2d();

  let width = 1;
  let height = 1;
  let dpr = 1;
  let lineH = MICRO * LEADING;
  let rowCount = 0;
  let rowTexts: string[] = [];
  const words = options.text.split(/\s+/);

  /** One row of fine print, starting at a different word on every row so rows don't repeat. */
  const rowText = (i: number, minChars: number) => {
    let out = "";
    let k = (i * 37) % words.length;
    while (out.length < minChars) {
      out += words[k % words.length] + " ";
      k++;
    }
    return out;
  };

  const setHeadline = () => {
    maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    maskCtx.clearRect(0, 0, width, height);
    maskCtx.fillStyle = "#000";
    maskCtx.textBaseline = "alphabetic";
    const gutter = Math.max(20, Math.min(78, width * 0.0516));
    const available = width - gutter * 2;
    const ref = 100;
    // Wide pages take wide letters; tall ones condensed letters, so they stay tall enough to read.
    const stretch = width >= height ? "expanded" : "condensed";
    maskCtx.font = `900 ${ref}px ${options.fonts.display}`;
    // Setting `font` resets the stretch, so it follows every font change.
    maskCtx.fontStretch = stretch;
    const sizes = options.rows.map((row) => (ref * available) / maskCtx.measureText(row).width);
    const cap = Math.min(...sizes) * 1.9;
    const fitted = sizes.map((s) => Math.min(s, cap));
    const block = fitted.reduce((a, s) => a + s * 0.86, 0);
    const scale = block > height * 0.7 ? (height * 0.7) / block : 1;
    let y = (height - block * scale) / 2 + height * 0.04;
    // Scaled down to fit the height, the block is narrower than the page: centre it.
    const left = gutter + (available * (1 - scale)) / 2;
    options.rows.forEach((row, i) => {
      const size = (fitted[i] ?? ref) * scale;
      maskCtx.font = `900 ${size}px ${options.fonts.display}`;
      maskCtx.fontStretch = stretch;
      y += size * 0.78;
      maskCtx.fillText(row, left, y);
      y += size * 0.08;
    });
    faintCtx.setTransform(1, 0, 0, 1, 0, 0);
    faintCtx.clearRect(0, 0, faint.width, faint.height);
    faintCtx.drawImage(mask, 0, 0);
    faintCtx.globalCompositeOperation = "source-in";
    faintCtx.fillStyle = options.colors.faint;
    faintCtx.fillRect(0, 0, faint.width, faint.height);
    faintCtx.globalCompositeOperation = "source-over";
  };

  const setRows = () => {
    lineH = MICRO * LEADING;
    rowCount = Math.ceil(height / lineH) + 1;
    const chars = Math.ceil((width * 2) / (MICRO * 0.42));
    rowTexts = Array.from({ length: rowCount }, (_, i) => rowText(i, chars));
    stripCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stripCtx.clearRect(0, 0, width * 2, height + lineH);
    stripCtx.fillStyle = options.colors.ink;
    stripCtx.font = `400 ${MICRO}px ${options.fonts.micro}`;
    stripCtx.textBaseline = "alphabetic";
    rowTexts.forEach((text, i) => stripCtx.fillText(text, 0, i * lineH + MICRO));
  };

  /** Each row drifts sideways, alternating direction, at its own slow pace. */
  const offset = (i: number, time: number) => {
    const speed = (i % 2 ? 1 : -1) * (5 + (i % 5) * 1.6);
    const span = width;
    return (((time * speed + i * 53) % span) + span) % span;
  };

  return {
    resize(w: number, h: number, pixelRatio: number) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      dpr = Math.min(2, pixelRatio);
      for (const c of [view, mask, faint, work]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      strip.width = Math.round(width * 2 * dpr);
      strip.height = Math.round((height + lineH) * dpr);
      setHeadline();
      setRows();
    },

    /** `reveal` 0–1 floods the fine print in from the top; `glyphs` 0–1 fades the letter tint. */
    frame(time: number, loupe: Lens, reveal = 1, glyphs = 1) {
      const W = view.width;
      const H = view.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = glyphs;
      ctx.drawImage(faint, 0, 0);
      ctx.globalAlpha = 1;

      // Fine print, clipped to the letters.
      workCtx.setTransform(1, 0, 0, 1, 0, 0);
      workCtx.globalCompositeOperation = "source-over";
      workCtx.clearRect(0, 0, W, H);
      const shown = reveal * rowCount;
      for (let i = 0; i < Math.min(rowCount, Math.ceil(shown)); i++) {
        const part = Math.min(1, shown - i);
        const sx = offset(i, time) * dpr;
        const sy = i * lineH * dpr;
        const sw = W * part;
        const sh = lineH * dpr;
        workCtx.drawImage(strip, sx, sy, sw, sh, 0, sy, sw, sh);
      }
      workCtx.globalCompositeOperation = "destination-in";
      workCtx.drawImage(mask, 0, 0);
      workCtx.globalCompositeOperation = "source-over";
      ctx.drawImage(work, 0, 0);

      if (loupe.on <= 0.01) return;

      // The loupe: the same composition at ZOOM, set again so it stays sharp.
      const r = loupe.r;
      const size = Math.ceil(r * 2 * dpr);
      if (lens.width !== size) {
        lens.width = size;
        lens.height = size;
      }
      const z = ZOOM * dpr;
      // Map page point (loupe.x, loupe.y) to the lens centre.
      const tx = r * dpr - loupe.x * z;
      const ty = r * dpr - loupe.y * z;
      lensCtx.setTransform(1, 0, 0, 1, 0, 0);
      lensCtx.globalCompositeOperation = "source-over";
      lensCtx.clearRect(0, 0, size, size);
      lensCtx.setTransform(z, 0, 0, z, tx, ty);
      lensCtx.fillStyle = options.colors.ink;
      lensCtx.font = `400 ${MICRO}px ${options.fonts.micro}`;
      const top = loupe.y - r / ZOOM;
      const bottom = loupe.y + r / ZOOM;
      const first = Math.max(0, Math.floor(top / lineH));
      const last = Math.min(rowCount - 1, Math.ceil(bottom / lineH));
      for (let i = first; i <= last && i < shown; i++) {
        lensCtx.fillText(rowTexts[i] ?? "", -offset(i, time), i * lineH + MICRO);
      }
      lensCtx.setTransform(ZOOM, 0, 0, ZOOM, tx, ty);
      lensCtx.globalCompositeOperation = "destination-in";
      lensCtx.drawImage(mask, 0, 0);
      lensCtx.globalCompositeOperation = "destination-over";
      lensCtx.drawImage(faint, 0, 0);
      lensCtx.globalCompositeOperation = "source-over";

      const cx = loupe.x * dpr;
      const cy = loupe.y * dpr;
      const R = r * dpr;
      ctx.save();
      ctx.globalAlpha = loupe.on;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.clearRect(cx - R, cy - R, R * 2, R * 2);
      ctx.drawImage(lens, cx - R, cy - R);
      ctx.restore();

      // Rim: a fine ring with a soft inner shade and a glint, like glass in a frame.
      ctx.save();
      ctx.globalAlpha = loupe.on;
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeStyle = options.colors.ink;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 6 * dpr;
      ctx.strokeStyle = options.colors.faint;
      ctx.beginPath();
      ctx.arc(cx, cy, R - 4 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2 * dpr;
      ctx.globalAlpha = loupe.on * 0.7;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(cx, cy, R - 9 * dpr, Math.PI * 1.1, Math.PI * 1.45);
      ctx.stroke();
      ctx.restore();
    },
  };
}
