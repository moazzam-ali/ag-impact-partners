# Motion system

The brief's motif is "le fil": one thin line that starts in the hero, runs down every page and ends
as a signature stroke. This doc is how that is built. The rules themselves are in
[../brief/site-structure.md](../brief/site-structure.md) ("Motion system").

## Setup

- `src/lib/motion/gsap.ts` is the only place GSAP is imported and plugins registered (ScrollTrigger, `useGSAP`). Components import `{ gsap, useGSAP, ScrollTrigger }` from there.
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
state (`.word` below its mask, the visual layer `visibility: hidden`). The GSAP setup applies the
real start values with `gsap.set`, then flips to `ready`. Under `prefers-reduced-motion` the CSS
shows everything immediately, so a no-JS or reduced-motion visitor sees the finished page.

## Handing words to GSAP

Never let GSAP read an element while the pending CSS transform still applies: it parses the computed
matrix as a fixed pixel `y`, and a later `yPercent` tween to 0 leaves that offset behind (the word
never shows). `armWords(section, words)` in `src/lib/motion/words.ts` does it in the right order:
release `data-state`, then `gsap.set({ yPercent: 112, y: 0 })`. Use it in every intro.

## The hero

The hero is built as variants (`src/components/sections/hero/variants.ts`): `home-hero.tsx` renders
the one named in `siteConfig.heroVariant`, and `?hero=<name>` overrides it for review (the choice is
remembered locally). Each variant is a self-contained section component.

### Variant "cables" (`hero-cables.tsx`)

A full-height dark band (`data-theme="dark"` on the
section) with the two headline lines top-left and bottom-right of a 1512px frame, positioned with
the spacing tokens (nav height + space-30 above, space-34 below, the Figma's 206 / 137). The
headline is one `h1` with two spans; each word is wrapped by `<Words>` for rise-in reveals.

Between the lines: `LightCables` (`src/components/motion/light-cables.tsx`), a WebGL fragment
shader adapted from Originkit. It fills the band, takes its colours from the hero's `--cables-*`
tokens, runs only while the hero is on screen, renders one still frame under reduced motion, caps
device pixel ratio at 1.5 and releases its context on unmount. Tune the bundle through its props
(`direction`, `positionX/Y`, `bundle`, `flow`, `speed`, `hover`, `grab`) and the three controls
added to the shader: `curve` (a standing bend, the same pull the pointer applies, so the bundle has
its S-shape without hover), `feedIn` / `feedOut` (where the cables light up from the tip and where
the tail fades) and `originGlow` (brightness where the cables converge). The hero's values are the
approved look; the tip moves per breakpoint because the shader's offsets are height-relative. If
WebGL is unavailable the band stays plain black and the page still reads.

The intro: cables fade up (1.8 s), title 1 words rise at 0.35 s, title 2 words at 1.0 s.

### Signature variants (ideation round, desktop only)

Studies of an "AG Impact" signature in the centre, each on `signature-shell.tsx` (band, headline,
hint; a variant passes its signature as children). **Intro rule:** both headline lines rise first
and the signature starts while they are still moving, never after it finishes: use
`SIGNATURE_INTRO` from the shell (`first` 0.15 s, `second` 0.45 s, `signature` 0.7 s). The cables
hero follows the same timing.

| Variant | Signature                                                                                                                     | Technique                                                   | Interaction                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| hello   | lowercase "ag impact", monoline school cursive (Hershey Script, Hershey licence)                                              | canvas, constant pen speed                                  | cursor plucks the strokes; a damped wave travels along them            |
| plume   | copperplate "AG Impact" (Pinyon Script, OFL) with a designed flourish                                                         | per-letter SVG masks drawn with DrawSVG, nib dot            | press and drag to write in peach; visitor ink fades                    |
| griffe  | executive autograph, peak A (Mrs Saint Delafield, Herr Von Muellerhoff, Hurricane, OFL) + paraphe                             | skeletonised glyphs, pressure-width outline                 | scroll-pinned signing; the paraphe's tail becomes the page thread      |
| fil     | "AG Impact" as one thread (EMS Felix, OFL)                                                                                    | canvas, three twisted strands                               | two lines meet, then gather into the name; grab and pull (Verlet rope) |
| sceau   | "AG Impact" embossed on paper (Luxurious Script, OFL), light theme                                                            | ink write-on, then WebGL relief from a height field         | the pointer is the light                                               |
| figma   | Figma frame 1:155: one peach pen line from title 1's full stop, through "ag impact partners", landing on title 2; light theme | smoothed Figma lines + script outlines written in pen order | none                                                                   |

Over a light hero (sceau, figma) the header takes the light palette too (`[data-header]` rule in
`tokens.css`). When one is chosen: delete the other folders, the `/lab` routes, the switcher flag and the GSAP
plugins nobody uses, then do mobile and polish.

## Checklist for a new animated section

1. One motion idea. It explains something (a figure, a change of side, a sequence).
2. Works as a still page; reduced-motion branch present.
3. Tokens only (`EASE`, `DURATION`); no gradients, blur, video or 3D.
4. Hidden start state in CSS behind `data-state="pending"`.
5. Mobile: shorter or simpler; pinned sequences capped.
