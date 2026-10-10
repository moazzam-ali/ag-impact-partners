import { gsap } from "./gsap";

/*
  Hands the masked words over from CSS to GSAP.

  A section starts in data-state="pending", where CSS holds every .word below its mask with
  translateY(112%). If GSAP reads the element while that rule applies, it parses the computed matrix
  as a fixed pixel `y`, and a later yPercent tween to 0 leaves that pixel offset behind (the word
  never appears). So: release the CSS state first, then set the start position in GSAP's own units.
  Both happen synchronously inside a layout effect, before the first paint, so nothing flashes.
*/
export function armWords(section: HTMLElement, words: Element[]) {
  section.dataset.state = "ready";
  gsap.set(words, { yPercent: 112, y: 0 });
}
