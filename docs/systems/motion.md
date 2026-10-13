# Motion system

The brief's motif is "le fil": one thin line that starts in the hero, runs down every page and ends
as a signature stroke. This doc is how that is built. The rules themselves are in
[../brief/site-structure.md](../brief/site-structure.md) ("Motion system").

## Animation conventions (the house feel, from Proxy Papers)

Every new page and section follows these. They match Proxy Papers (`~/dev/clients/proxy-papers`:
`src/lib/gsap.js`, `src/lib/animations/`, `PageTransitionProvider.jsx`), which is the reference for
how motion should feel here. Pile 2, its line of fields, the Expertise page and the curtain follow
them already; the older hero studies do not and are not to be copied.

**Feel.** Calm and precise. Reveals ease out, moves ease in and out, exits ease in, nothing
overshoots except a logo shape popping in.

| Use                                  | Ease                           | Duration and stagger          |
| ------------------------------------ | ------------------------------ | ----------------------------- |
| Hero headline words (masked rise)    | `EASE_OUT` (power3.out)        | 0.55 s, 0.035 s apart         |
| Hero lead / sub-line / eyebrow words | `EASE_OUT`                     | 0.35 s, 0.008 s apart         |
| Section title words                  | `EASE_OUT`                     | 0.75 s, 0.07 s apart          |
| Section body words                   | `EASE_OUT`                     | 0.7 s, 0.016 s apart          |
| Buttons, figures, small blocks       | `EASE_OUT`, from `y: 16`       | 0.5 s (rows 0.7 s from 24 px) |
| Rules, lines, clip reveals           | `EASE_STANDARD` (power2.inOut) | 0.9-1.5 s                     |
| Big moves (sheets, panels, zooms)    | `EASE_STANDARD`                | 0.7-1 s                       |
| Exits (things leaving before a move) | power2.in                      | 0.3-0.4 s                     |
| Bows, hovers, gentle drifts          | sine.inOut (yoyo)              | as needed                     |
| A logo shape popping in              | elastic.out(1, 0.5)            | 0.8 s                         |

**How a section is built.**

- One hook per section in `src/lib/animations/use-<section>.ts`, taking the section's ref:
  `useGSAP(fn, { scope })`, `gsap.utils.selector(section)` for targets, and data attributes for
  them (`[data-title]`, `[data-lead]`, `[data-rise]`, `[data-row]`), never CSS Module classes. The
  component only renders and calls the hook. Examples: `use-pile2-hero.ts`, `use-expertise.ts`,
  `use-fields-line.ts`.
- Reduced motion first: if `prefers-reduced-motion` is set, set `data-state="ready"` and return.
- Words: render copy that animates with `<Words>`, hand them to GSAP with `armWords`, rise them to
  `yPercent: 0`. Timelines take `defaults: { ease: EASE_OUT, force3D: true }`.
- Above the fold: build the timeline paused and play it with `afterCurtain()`, so it starts as the
  splash or page change uncovers the page; delay it `hasClientNavigated() ? 0.46 : 0.1`
  (`lib/motion/nav-state.ts`) so after a page change it waits for the top to be uncovered.
- Held stages (a sequence played while the screen stays put): CSS `position: sticky` inside a
  taller section driven by a ScrollTrigger, not `pin: true`. No pin-spacer, so one section's
  refresh never shifts another's (A2, A3).
- Below the fold: `scrollTrigger: { trigger, start: "top 78%", once: true }`, created once the
  curtain is open (rows already in view would otherwise reveal behind it), then
  `scheduleRefresh()` (`lib/motion/gsap.ts`) once the layout has settled.
- Constants: `EASE_OUT`, `EASE_STANDARD`, `DUR_REVEAL`, `DUR_STAGGER` and `scheduleRefresh` from
  `@/lib/motion/gsap`; no stray ease strings outside this table.
- Scrolling is Lenis with Proxy Papers' settings (below); page changes are the bending sheet
  (below). Neither is redone per page.

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

## Smooth scrolling

Lenis (`src/components/motion/smooth-scroll.tsx`, in the locale layout) smooths wheel and trackpad
scrolling with Proxy Papers' settings (`duration` 1.8 s, expo-out easing; see its
`LenisProvider`); touch keeps the device's own momentum. It runs on GSAP's ticker and
updates ScrollTrigger on every scroll, so pinned and scrubbed sections move in step with it. It is
stopped while the curtain covers the page and jumps to the top on each new page. With reduced motion
it never starts and the browser scrolls natively. `html.lenis` turns off CSS `scroll-behavior` so the
browser does not smooth Lenis's own steps. Elements that must scroll on their own take
`data-lenis-prevent`.

## The curtain: splash and page transitions

One fixed layer over everything (`src/components/motion/curtain/`), run by `MotionShell` in the
locale layout. It plays the splash once per page load, then covers and uncovers the page on every
internal link. Eight styles are under review, each a splash and its matching page transition; the
pill under the header ("Rideau") switches them (stored, reloads), `?curtain=<name>` too.

Feedback so far: the traced build-up (the mark drawn shape by shape) and feuillets' in and out are
liked; the splash must show the wordmark; motion smooth, minimal, finished in the details. The
six newer styles all build the same traced lockup (`lockup.tsx`: the mark traced shape by shape
and filled as each closes, the wordmark rising line by line from a mask, a hairline loader with a
head dot and a count, never faster than one trace in 1.1 s).

| Style     | Splash                                                                                                                                                             | Page transition (one movement)                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| fil       | A hairline across the middle; the mark rises above it, the wordmark hangs below, the line fills. Both go back into the line; the screen parts along it.            | The halves meet on the line and part again.                                          |
| sommet    | Peach floods out, the mark assembles from its three shapes, the letters rise, a big count. The page shows through the mark, which zooms open.                      | A peach sheet sweeps up over the page and on off the top.                            |
| feuillets | Ink, peach and paper sheets slide up with curved edges; the lockup builds on the paper, a signature is written as the loader; the sheets lift away.                | The sheets sweep up over the page and on off the top.                                |
| esquisse  | A paper proof: the sheet wipes up, crop marks open, the traced lockup. Then the mark becomes a paper window onto the page and zooms open, edged in accent.         | The paper wipes up over the page and on off the top, an accent hairline on its edge. |
| iris      | A disc in the page's colours inverted opens from the centre, a fine accent ring on its edge; the traced lockup. Then the iris closes onto the mark.                | The iris opens from the link that was clicked and closes on the next page.           |
| biais     | The traced lockup with a caption on the page's colour. The curtain leaves along the A's angle, an accent hairline on its edge, the lockup held still as it is cut. | The panel crosses on the bias, both edges lined in accent.                           |
| feuille   | One paper sheet rises with a thin rim of accent on its curved edge; the traced lockup drifts against its movement. The sheet lifts away, the rim trailing.         | The sheet sweeps up through the screen, its rim leading.                             |
| tourne    | A page turn: ink then paper slide in from the right, edges curved, the paper's shadow on the ink; the traced lockup. They carry on out to the left.                | A page turns across the screen.                                                      |

- **Page changes feel like Proxy Papers'.** The sheet styles (sommet, feuillets, esquisse, feuille,
  tourne) use the bending sheet (`bend.tsx`): the leading edge bows out as it travels and flattens
  as it lands (power2.inOut 0.72 s to cover, 0.82 s to reveal, the bow a sine yoyo), layers a beat
  or a few percent apart. Fil, iris and biais keep their own shape on the same curve. The mark
  rises in over the last half second of the cover and drifts up and away as the reveal starts
  (`markBeat`). The route changes at the `covered` label; links are prefetched when pointed at, so
  it rarely waits there.
- **Logo.** `brand/logo-parts.ts` is the logo SVG split into parts (the mark's three shapes, each
  letter with its counters), generated from `public/brand/logo-charcoal.svg`; `LogoLockup` draws
  the lockup, the mark or the wordmark with every part addressable. `markStage` (`run.ts`) places
  the mark on a viewport-sized SVG and zooms a mark-shaped window or clip (sommet, niveau). A
  `clipPath` takes shapes only, so niveau puts the transform on each path.
- **Loader.** `trackLoad()` (`lib/motion/curtain.ts`) crawls while fonts and the page load, for at
  least ~1.4 s so it reads as a count, finishes when both are in, never waits more than 6 s.
- **Page intros wait.** The curtain store is closed while the page is covered and opens as the
  reveal starts. `afterCurtain(fn)` starts a timeline then (pile2, its thread, Expertise);
  `useCurtainOpen()` renders on it. Other hero variants are remounted once it opens.
- **Navigation.** A click on an internal link to another page is caught in the capture phase (so
  Next's Link sees it as prevented) and runs the style's swap. Modified clicks, new tabs,
  downloads, other origins and same-page links are left alone; back and forward have no cover.
- **First paint.** The server HTML has a plain cover in the page colour; the chosen style replaces
  it after hydration and starts the splash. Without script the cover is not shown; if the script
  never starts it fades on its own after 7 s.
- **Reduced motion.** The lockup stands still while the count runs, then the curtain fades;
  transitions are a short fade.
- **Demo page.** `/expertise` (simple): the brief's line on the five fields and the fields in
  order, with an intro gated on the curtain, so switching pages shows both halves.

## The hero

The homepage hero is Pile 2. Every other hero studied along the way (the signature variants, light
cables and five rounds of studies, with their lab pages and the variant switcher) is kept on the
`archive/hero-studies` branch, which also has a Vercel preview.

Pile 2 (`src/components/sections/hero/pile2/`): the headline in Instrument Sans at poster size, a
ream of the 300 contracts standing on it, sheets you can pull out and lay on top (each one a
different document), the five fields on a running line, both themes. Its motion follows the
conventions above (`src/lib/animations/use-pile2-hero.ts`, `use-fields-line.ts`).

- **Layers.** Back to front: line one of the headline, the WebGL ream (transparent canvas: the ream
  stands on the type and, on light, its shadow falls on it), then line two, the copy, the callout
  and the thread. The h1 is a subgrid over the middle rows, so its two lines frame the ream without
  leaving one heading. Line two is set in JS a little wider (1.12×) than line one, within the frame.
  An empty `[data-stage]` box marks where the ream goes (its height follows the width; the gap under
  line one matches the one above line two); the scene centres the ream there and backs the camera off until it fits the
  box's height or width. The hero is as tall as its content (it does not have to fit one screen)
  and wider than the page frame (1720px).
- **Build.** About 1.7 s: sheets settle from 3 cm with a little drift (no tumbling), the signed top
  sheet last and slower. The counter keeps pace.
- **Pull.** The sheet under the cursor slides 4.5 cm out (no tag: the cursor turns to a hand); a click
  draws it out along its length, lifts it, turns it towards you and lays it on top (1.35 s). The
  top face takes one at random; idle, one comes up every few seconds. The next document is always
  the field that has been longest off the top, so the five come round in turn. A leader line ties
  the top sheet to a callout naming its field (named as the sheet starts to settle). The callout holds every field's text in one cell, showing the one on top,
  so it keeps the height of the longest and neither it nor the leader line moves; a long name
  (purchase contract optimisation) steps down a size onto two balanced lines.
- **Documents.** Five designs, one per field, printed once to canvas (`pile2/documents.ts`): a
  contract, an annex with a schedule and a "Confidentiel" stamp, articles in two columns, a term
  sheet with dotted leaders, the approved "10 à 30 %" page. Real words only from the brief; the
  rest is greyed lines. Each design has its own paper stock and size, so the ream's edge shows
  different documents. Sheets are one instanced mesh; a pool of six printed planes follows the
  faces that can be seen.
- **Le fil des domaines** (`pile2/fil-domaines.tsx`). A slim running line of the five fields, edge
  to edge with no visible label (the list is named for screen readers), each a small card: a line
  icon (`pile2/icons.tsx`; accent strokes that don't scale, one moving part in ink) and the field's
  name, no numbers, none singled out. The callout shows the same icon. Drawn in from the left on load,
  then a GSAP loop: faster with scroll, reversed when scrolling up, nearly still under the pointer.
- **Themes.** No `data-theme` on the section: it follows the site. A MutationObserver on
  `<html data-theme>` re-lights the scene (shadow catcher only on light). Thread in
  `--accent-strong` on light, `--accent` on dark.
- **Reduced motion.** Ream already built, pulls are instant, the thread stands still.

## Home sections

**Ce que nous négocions (A2)** (`src/components/sections/home/what-we-negotiate/`,
`use-what-we-negotiate.ts`): the hero's sentence carries on, set like a field on a contract. One
hairline runs across the frame; the label sits on its left end as the caption and the phrase stands
on the line to its right, bottom-aligned, so caption and phrase read as one sentence. The statement
steps down into the last two columns; the client types run along the foot of the stage.

- **Sequence.** The section is one screen plus a run (230svh desktop, 190 tablet, 140 phone) with a
  CSS sticky stage. Thresholds at 16, 42 and 68% of the run swap the phrase whole, never half way:
  its words leave upwards (power2.in, 0.3 s), the next rise in (0.75 s, 0.07 s apart); scrolling
  back reverses it. The four share one grid cell, so the slot keeps the tallest one's height. The
  hairline under the phrase fills a quarter per step in `--thread`, with 01–04 beneath it.
- **Intro.** Once at 78%, after the curtain: label and phrase rise, the hairline draws (1.2 s), the
  statement's words follow, the numbers and client line fade up.
- **Client line.** Text only, names split by short rules, full width under a hairline. It drifts
  left to right at 14 px/s, no scroll boost, no pause on hover (the hero's fields line runs the
  other way, faster), and stops off screen. On phones it follows the statement.
- **Still page.** Reduced motion, no script or a screen under 480px tall (a phone on its side):
  the four stacked, the client line wrapped. The hook's two `matchMedia` branches match the CSS;
  the still page's CSS overrules what GSAP's revert leaves on the words when a phone is turned.

**Ce qui nous distingue (A3)** (`src/components/sections/home/why-us/`, `use-why-us.ts`): one
full-bleed line, the table, splits a held stage. The headline stands on it, its baseline on the
line and clipped there, so it never shows below the table. Everything else hangs from it: the pull
line under the headline, and from a hinge marked by a knot on the line, the label and the body.

- **Entrance.** Once, as the line comes into view: it draws across, the headline's words rise out
  of the table, then the body, the knot and the label.
- **The gesture.** Scrubbed over a CSS sticky run (270svh desktop, 90svh phone): the table tips
  2.2° about the knot, the headline turns over the edge away from you and comes back up from the
  near side (out at 90°, in from −90°, never mirrored), the table settles and the pull line swings
  out from underneath; the last third is a hold.
- **Tablet and phone.** One column, the label above the headline, the knot at the line's right
  end; the body waits under the line and steps down as the pull line comes. Phones tilt 1.2°.
- **Reduced motion.** The last frame, still.

## Checklist for a new animated section

1. One motion idea. It explains something (a figure, a change of side, a sequence).
2. Works as a still page; reduced-motion branch present.
3. The house feel and structure in "Animation conventions" (one hook per section, the eases and
   durations there); no gradients, blur or video; the hero's 3D is the agreed exception.
4. Hidden start state in CSS behind `data-state="pending"`.
5. Mobile: shorter or simpler; pinned sequences capped.
