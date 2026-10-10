import { PLUME_STROKES } from "./plume-geometry";

/** When the pen touches the paper, in seconds after mount. */
export const PEN_START = 0.9;

/**
 * When the last stroke (the t-cross) is finished: writing time plus pen lifts (the few short
 * retraces, 0.06 s each, are left out; the headline cue does not need to be exact).
 */
export const PEN_END =
  PEN_START + PLUME_STROKES.reduce((total, stroke) => total + stroke.lift + stroke.duration, 0);
