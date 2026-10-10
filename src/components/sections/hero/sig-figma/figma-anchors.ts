import { FIGMA_ANCHORS, FIGMA_FRAME } from "./figma-geometry";
import { type Point } from "./figma-line";

/*
  Where the pen touches down and lands, measured from the rendered headline so the line fits the copy
  in any language ("Nous négocions." is longer than "We negotiate.", "Jusqu'à" starts further right
  than "All") and any viewport height (line 2 sits lower in a taller hero). Returned in the art's
  frame space (1512 × 982 design px), with the offset that keeps the script centred between the lines.

  The word masks (.word-mask) are measured, not the words: the words are translated while they rise.
  The offsets, in em of each line's font size, are calibrated on the rendered English headline at
  1512 × 982 so the line touches the glyphs where the Figma's does: the bottom-right corner of the
  full stop, and the lower third of the first letter's left stroke.
*/

const START = { dx: -0.101, dy: 0.832 }; // from title 1's last word: right edge, top
const END = { dx: 0.217, dy: 0.651 }; // from title 2's first word: left edge, top

export type Layout = { start: Point; end: Point; script: Point };

export const FIGMA_LAYOUT: Layout = {
  start: FIGMA_ANCHORS.start,
  end: FIGMA_ANCHORS.end,
  script: { x: 0, y: 0 },
};

export function measureLayout(art: SVGSVGElement, section: HTMLElement): Layout {
  const frame = art.getBoundingClientRect();
  const px = frame.width / FIGMA_FRAME.width;
  const words1 = section.querySelectorAll<HTMLElement>('[data-title="1"] .word-mask');
  const last = words1[words1.length - 1];
  const first = section.querySelector<HTMLElement>('[data-title="2"] .word-mask');
  if (!px || !last || !first) return FIGMA_LAYOUT;

  const toFrame = (x: number, y: number) => ({
    x: (x - frame.left) / px,
    y: (y - frame.top) / px,
  });
  const em = (el: HTMLElement) => parseFloat(getComputedStyle(el).fontSize) / px;
  const r1 = last.getBoundingClientRect();
  const r2 = first.getBoundingClientRect();
  const em1 = em(last);
  const em2 = em(first);
  const a = toFrame(r1.right, r1.top);
  const b = toFrame(r2.left, r2.top);
  const start = { x: a.x + START.dx * em1, y: a.y + START.dy * em1 };
  const end = { x: b.x + END.dx * em2, y: b.y + END.dy * em2 };
  // The script stays centred in the band between the two lines.
  const shift = (start.y - FIGMA_ANCHORS.start.y + (end.y - FIGMA_ANCHORS.end.y)) / 2;
  return { start, end, script: { x: 0, y: shift } };
}
