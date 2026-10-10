# Motion system

The brief's motif is "le fil": one thin line that starts in the hero, runs down every page and ends
as a signature stroke. This doc is how that is built. The rules themselves are in
[../brief/site-structure.md](../brief/site-structure.md) ("Motion system").

## Setup

- `src/lib/motion/gsap.ts` is the only place GSAP is imported and plugins registered (ScrollTrigger
  for the page thread, DrawSVG, MotionPath, `useGSAP`). Components import `{ gsap, useGSAP, ScrollTrigger }` from there.
- `src/lib/motion/tokens.ts` holds eases, durations and staggers. Use them; do not type ease strings
  in components. The brief wants slow, precise motion and nothing that bounces: `EASE.pop` is the
  one exception, for a dot landing.
- Every intro is written inside `gsap.matchMedia()` with two branches: `MOTION_OK` (the animation)
  and `REDUCED_MOTION` (the settled state, set synchronously). Both end by setting
  `data-state="ready"` on the section.
- `useGSAP(fn, { scope })` scopes selectors and reverts everything on unmount. Pass
  `dependencies` + `revertOnUpdate: true` when the setup must rebuild (e.g. the mobile crop).

## No flash before hydration

Sections render with `data-state="pending"`. CSS keeps the animated parts in their hidden start
state (`.word` below its mask, the signature layer `visibility: hidden`). The GSAP setup applies the
real start values with `gsap.set`, then flips to `ready`. Under `prefers-reduced-motion` the CSS
shows everything immediately, so a no-JS or reduced-motion visitor sees the finished page.

## Handing words to GSAP

Never let GSAP read an element while the pending CSS transform still applies: it parses the computed
matrix as a fixed pixel `y`, and a later `yPercent` tween to 0 leaves that offset behind (the word
never shows). `armWords(section, words)` in `src/lib/motion/words.ts` does it in the right order:
release `data-state`, then `gsap.set({ yPercent: 112, y: 0 })`. Use it in every intro.

## The hero stage

`HeroStage` (`src/components/sections/hero/hero-stage.tsx`) is the Figma frame: 1512 × 982 stage
pixels. `--stage-px` (tokens.css) is one stage pixel after scaling the frame to fit the viewport, so
every measurement from Figma is `calc(N * var(--px))`. The header shares `--gutter` with the stage so
the logo and the headline align at any width. Below 900px the stage becomes a stacked flow and the
art layer shows only `MOBILE_CROP` of the stage.

The headline is one `h1` with two positioned spans; each word is wrapped by `<Words>` for rise-in
reveals (server-rendered, no SplitText).

## The signature

Geometry is in `signature-paths.ts`, in stage space, hand-authored. `home-hero.tsx` draws it in SVG:
the lead-in and the outro paths with `drawSVG`, the script text (`<text>` in the signature face,
`textLength` pinned to the Figma width) wiped in with an animated `clipPath` rect, and a pen dot that
follows each segment with `motionPath`. Timeline: title 1 words rise, pen touches down after the full
stop, lead-in loop, the name is written, the outro sweeps and loops around the first letter of
title 2, the pen lifts, title 2 words rise.

## Anchors and tuning the paths

The two points that depend on the copy (just right of title 1's full stop, just left of title 2's
first letter) are measured from the rendered headline by `anchors.ts` and passed into the path
builders in `signature-paths.ts`, so the French and the English headline both fit. Everything else
in a path is fixed stage geometry. On the mobile stack the Figma defaults (`DEFAULT_ANCHORS`) apply.

To tune: open `?hero=…`, resize to 1512 wide (`--stage-px` is then 1px, so stage units are CSS
pixels) and edit the `d` builders. Keep the lead-in starting at `start` and the last segment ending
at `end`.

## Checklist for a new animated section

1. One motion idea. It explains something (a figure, a change of side, a sequence).
2. Works as a still page; reduced-motion branch present.
3. Tokens only (`EASE`, `DURATION`); no gradients, blur, video or 3D.
4. Hidden start state in CSS behind `data-state="pending"`.
5. Mobile: shorter or simpler; pinned sequences capped.
