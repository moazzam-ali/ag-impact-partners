/*
  Type model for Rapport. Each letter's advance width is measured once at three widths of Archivo's
  wdth axis (62, 100, 125, each with its paired weight) and interpolated in between, so every frame
  can lay the rows out without reading the DOM.
*/
export const SAMPLES = [62, 100, 125] as const;

export type Advances = [number, number, number];

/** Pressure makes letters denser: squeezed letters get heavier, stretched ones lighter. */
export function weightFor(width: number) {
  return Math.round(600 + (100 - width) * 3.2);
}

/** Letter width for a side that holds `share` (0–1) of the band: 100 at an even split. */
export function widthFor(share: number) {
  if (share >= 0.5) return Math.min(125, 100 + ((share - 0.5) / 0.32) * 25);
  return Math.max(62, 100 - ((0.5 - share) / 0.32) * 38);
}

/** Advance width at wdth `w`, linear between the measured samples. */
export function advance([a, b, c]: Advances, w: number) {
  return w <= 100 ? a + ((w - 62) / 38) * (b - a) : b + ((w - 100) / 25) * (c - b);
}

/** Splits a line into `count` rows of whole words with the most even lengths. */
export function balanceRows(text: string, count: number): string[] {
  const words = text.split(" ");
  if (count <= 1 || words.length <= 1) return [text];
  let best: string[] = [text];
  let bestLongest = Infinity;
  for (let cut = 1; cut < words.length; cut++) {
    const head = words.slice(0, cut).join(" ");
    const tail = balanceRows(words.slice(cut).join(" "), count - 1);
    const rows = [head, ...tail];
    const longest = Math.max(...rows.map((row) => row.length));
    if (longest < bestLongest) {
      bestLongest = longest;
      best = rows;
    }
  }
  return best;
}
