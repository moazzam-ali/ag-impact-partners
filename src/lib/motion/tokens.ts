/*
  Motion tokens for GSAP. The brief asks for slow, precise easing and nothing that bounces; `pop` is
  the one exception, reserved for a dot landing. CSS-side equivalents live in src/styles/tokens.css.
*/
export const EASE = {
  out: "power3.out",
  inOut: "power3.inOut",
  soft: "power2.out",
  draw: "power2.inOut",
  words: "power4.out",
  linear: "none",
  pop: "back.out(3)",
} as const;

export const DURATION = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
  words: 0.95,
  draw: 2.2,
} as const;

export const STAGGER = {
  words: 0.07,
} as const;

/** Media queries for gsap.matchMedia(): every intro has a static branch. */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** The stage switches from the scaled Figma frame to a stacked layout below this width. */
export const MOBILE_QUERY = "(max-width: 899px)";
