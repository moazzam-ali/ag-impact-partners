/*
  Motion tokens for GSAP. The brief asks for slow, precise easing and nothing that bounces; `pop` is
  the one exception, reserved for a dot landing. CSS-side equivalents live in src/styles/tokens.css.
*/
export const EASE = {
  out: "power3.out",
  inOut: "power3.inOut",
  soft: "power2.out",
  words: "power4.out",
  linear: "none",
  pop: "back.out(3)",
} as const;

export const DURATION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
  words: 0.95,
} as const;

export const STAGGER = {
  words: 0.07,
} as const;

/** Media queries for gsap.matchMedia(): every intro has a static branch. */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** Breakpoints, matching the CSS media queries (mobile ≤ 767, tablet ≤ 1023). */
export const MOBILE_QUERY = "(max-width: 767px)";
export const TABLET_QUERY = "(max-width: 1023px)";
