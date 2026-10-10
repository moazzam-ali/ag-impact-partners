import { DEFAULT_ANCHORS, STAGE, type Anchors } from "./signature-paths";

/*
  Where the pen touches down and lands, measured from the rendered headline so the signature fits
  the copy in any language. Returns stage-space coordinates (1512 × 982). Falls back to the Figma
  anchors when the stage is not laid out as the scaled frame (mobile stack).
*/

// Instrument Sans with line-height: normal puts the baseline about 78% down the line box.
const BASELINE = 0.78;

export function measureAnchors(stage: HTMLElement): Anchors {
  const title1 = stage.querySelector<HTMLElement>('[data-title="1"]');
  const title2 = stage.querySelector<HTMLElement>('[data-title="2"]');
  const frame = stage.getBoundingClientRect();
  const px = frame.width / STAGE.w;
  if (!title1 || !title2 || !px || getComputedStyle(title1).position !== "absolute") {
    return DEFAULT_ANCHORS;
  }

  const r1 = title1.getBoundingClientRect();
  const r2 = title2.getBoundingClientRect();
  const size1 = parseFloat(getComputedStyle(title1).fontSize) / px;
  const size2 = parseFloat(getComputedStyle(title2).fontSize) / px;
  const toStage = (x: number, y: number) => ({ x: (x - frame.left) / px, y: (y - frame.top) / px });

  // Just right of the full stop, a touch above the baseline.
  const period = toStage(r1.right, r1.top + r1.height * BASELINE);
  // Just left of the first letter, mid cap-height.
  const first = toStage(r2.left, r2.top + r2.height * BASELINE);

  return {
    start: { x: period.x - size1 * 0.04, y: period.y - size1 * 0.04 },
    end: { x: first.x - size2 * 0.06, y: first.y - size2 * 0.36 },
  };
}
