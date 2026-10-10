/*
  Signature geometry, in the 1512 × 982 Figma stage space. Paths are hand-authored; the two points
  that depend on the copy (where the pen touches down after title 1's full stop, and where it lands
  on title 2's first letter) are measured at runtime (see anchors.ts) and passed in, so the stroke
  fits the French and the English headline alike.
*/

export const STAGE = { w: 1512, h: 982 } as const;

export const DESKTOP_VIEWBOX = `0 0 ${STAGE.w} ${STAGE.h}`;

/** The slice of the stage that holds the signature; the art area on mobile shows only this. */
export const MOBILE_CROP = { x: 160, y: 270, w: 1310, h: 620 } as const;
export const MOBILE_VIEWBOX = `${MOBILE_CROP.x} ${MOBILE_CROP.y} ${MOBILE_CROP.w} ${MOBILE_CROP.h}`;

export type Point = { x: number; y: number };
export type Anchors = { start: Point; end: Point };

/** Figma's English headline: pen touchdown right of the full stop, landing on the "A" of "All". */
export const DEFAULT_ANCHORS: Anchors = {
  start: { x: 664, y: 300 },
  end: { x: 664, y: 812 },
};

const n = (v: number) => v.toFixed(1);

/*
  The signature. Three movements: a lead-in loop from the full stop down to the left, the name
  written along a baseline, then an outro that sweeps right, dives back under and loops around the
  first letter of title 2.
*/
export const SIGNATURE = {
  leadIn: ({ x, y }: Point) =>
    `M ${n(x)} ${n(y)} C ${n(x + 26)} ${n(y + 42)}, 690 400, 600 470 C 500 530, 300 500, 215 540 C 170 562, 190 600, 250 598 C 290 597, 310 585, 326 572`,
  script: { x: 325, y: 572, width: 1057, fontSize: 100, clip: { x: 300, y: 430, w: 1110, h: 230 } },
  baseline: "M 326 572 L 1385 562",
  outro: ({ x, y }: Point) =>
    `M 1385 562 C 1420 540, 1445 575, 1420 612 C 1380 670, 1200 715, 960 735 C 760 752, 580 740, ${n(x - 159)} ${n(y - 42)} C ${n(x - 202)} ${n(y - 22)}, ${n(x - 196)} ${n(y + 34)}, ${n(x - 134)} ${n(y + 48)} C ${n(x - 74)} ${n(y + 60)}, ${n(x - 14)} ${n(y + 30)}, ${n(x)} ${n(y)}`,
} as const;
