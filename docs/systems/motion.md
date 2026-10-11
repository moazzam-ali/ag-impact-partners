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

### Hero study "pile2" (Pile, redone)

Asked for on 12 Oct 2026: Pile again, in the site's own face (Instrument Sans) at poster size, a
redone title and UI, a shorter and calmer build, sheets you can pull out and lay on top (each one a
different document), the services as a creative running list with drawings, and both themes. First
in the switcher (key 1); `/lab/pile2`.

- **Layers.** Back to front: line one of the headline, the WebGL ream (transparent canvas: the ream
  stands on the type and, on light, its shadow falls on it), then line two, the copy, the callout
  and the thread. The h1 is a subgrid over the middle rows, so its two lines frame the ream without
  leaving one heading. An empty `[data-stage]` box marks where the ream goes; the scene centres it
  there and backs the camera off until it fits the box's height or width.
- **Build.** About 1.7 s: sheets settle from 3 cm with a little drift (no tumbling), the signed top
  sheet last and slower. The counter keeps pace.
- **Pull.** The sheet under the cursor slides 4.5 cm out (a pill names it, "Feuille 147"); a click
  draws it out along its length, lifts it, turns it towards you and lays it on top (1.35 s). The
  top face or the "Une feuille au hasard" button takes one at random; idle, one comes up every few
  seconds. The next document is always the field that has been longest off the top, so the five
  come round in turn. A leader line ties the top sheet to a callout naming its field; the thread
  marks the same field.
- **Documents.** Five designs, one per field, printed once to canvas (`pile2/documents.ts`): a
  contract, an annex with a schedule and a "Confidentiel" stamp, articles in two columns, a term
  sheet with dotted leaders, the approved "10 à 30 %" page. Real words only from the brief; the
  rest is greyed lines. Each design has its own paper stock and size, so the ream's edge shows
  different documents. Sheets are one instanced mesh; a pool of six printed planes follows the
  faces that can be seen.
- **Le fil des domaines** (`pile2/fil-domaines.tsx`). The five fields on one running thread (the
  track's bottom border): names sit on it, and between them it rises into a line drawing of the
  field (mast, screen, network, projector, signed page; strokes don't scale) whose ink parts move in
  CSS. The field's own lines from the brief stand beside it in small capitals. Drawn in from the
  left on load, then a GSAP loop: faster with scroll, reversed when scrolling up, nearly still
  under the pointer.
- **Themes.** No `data-theme` on the section: it follows the site. A MutationObserver on
  `<html data-theme>` re-lights the scene (shadow catcher only on light). Thread in
  `--accent-strong` on light, `--accent` on dark.
- **Reduced motion.** Ream already built, pulls are instant, the thread stands still.

### Hero studies, round 5 (cadre, index, editorial, diptyque, fenetres)

Feedback on round 4: popup, dossier and macro liked; table "too much for a hero". The ask for round
5: different layouts, the decoration and titles working together, images that show what the firm
does. These are image-led intros with the full brief copy (eyebrow, headline, sub-line, both calls to
action). Switcher keys 1–5; `/lab/<name>`.

Imagery: eight pictures generated for the project in one art direction (low-key, charcoal, one
peach-amber light, no faces, no logos), in `src/assets/hero/`, imported through `hero/imagery.ts`
(`FIELD_IMAGES` in the brief's fixed order, `SCENES`). Not stock, but the client must approve them
(or a commissioned shoot replaces them) before any real use.

| Variant   | What happens                                                                                                                                                                                                                                                          | Technique                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| cadre     | Full-bleed pictures of the five fields take turns behind the headline (wipe from the right behind a peach hairline, slow push-in). Bottom right, the five fields as a timeline: current one lit, its line from the brief, a filling progress line; any can be chosen. | `next/image` stack, clip-path transitions in CSS, React state for the index.                    |
| index     | On paper: intro on top, the five fields as a large index below. Hovering a row opens its picture in a frame that trails the cursor; idle, the index walks through the fields with the frame parked.                                                                   | GSAP `quickTo` for the frame, clip-path reveals per picture.                                    |
| editorial | A magazine cover: copy left (second line in italic), a tall picture of the roofs with an inset of a hand signing, the three approved figures across the bottom. Plates open upwards; parallax with cursor and scroll.                                                 | CSS grid, GSAP timeline, ScrollTrigger scrub.                                                   |
| diptyque  | Two pictures, the boardroom under "Nous négocions." and the signing hand under "Jusqu'à la signature.", come in from opposite edges and meet at a peach hairline (the "meet"). The side under the cursor opens wider.                                                 | Two clipped panels driven by one `--split`. Stacks the two lines on phones.                     |
| fenetres  | "Nous négocions." in heavy capitals with the fields' pictures inside the letters, taking turns; scrolling dives through the O until the picture fills the screen and names its field.                                                                                 | `background-clip: text`, cross-fading twins, a pinned scroll that scales about the O's counter. |

### Hero studies, round 4 (table, popup, dossier, macro)

The user liked signataire, pile and (a bit) salle: 3D, physical, cinematic. Round 4 stays there.
Switcher keys 1–4; `/lab/<name>`. They reuse signataire's printed page, strokes, pen and hand.

| Variant | What happens                                                                                                                                                                                                                                                                                 | Technique                                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| table   | Seen from above a walnut table: our hand (navy sleeve, navy ink) near the camera, theirs (grey sleeve, red ink) across. One contract goes back and forth, spinning to face each side, collecting a struck term and initials from each, then both sign; it slides away and the next comes in. | Two posed hands (`loadHand` twice), one page with per-stroke inks (`PaperDoc.setStrokes` takes a colour per stroke), a second signature hand (`OTHER_HAND`); all a function of time in a 12.4 s cycle. |
| popup   | A cloth-bound book opens on a pale desk and Paris rises out of it in cut paper: the Eiffel Tower, two rows of Haussmann facades with windows cut through, one lit, a front row of lamps; "Paris" printed on the page. Cursor tilts; scrolling away closes it.                                | Canvas-drawn alpha cut-outs on cards hinged to the far page (alpha-tested shadows through the windows), raking light from behind.                                                                      |
| dossier | A leather portfolio with the peak mark in peach foil opens onto the first of the five fields; three screens of pinned scroll turn the pages, each curling over, through the five fields (brief copy, fixed order) to the signed contract.                                                    | Leaves are 40-segment strips rebuilt per frame from their turn angle (the free edge lags: the curl); two-sided materials, the back mirrored.                                                           |
| macro   | A few centimetres from a fountain pen's nib, shallow focus, following it as it writes the signature in wet, glossy ink; the pen lies down and the camera pulls back to the signed contract. The headline turns from dark to light as the desk comes into view.                               | Bokeh pass (focus tracks the nib, aperture closes on the pull-back), paper tooth as a bump map, ink as clear-coated ribbons drying to matte.                                                           |

### Hero studies, round 3 (signataire, loupe, confidentiel, pile, salle)

Round 2's contract idea (redline) was liked but not its execution; round 3 tries the dossier world
in five other ways. Same setup: switcher keys 1–5 (the switcher now wraps and marks each round),
`/lab/<name>`. Three.js (`three`) is a dependency for the 3D studies.

| Variant      | What happens                                                                                                                                                                                                               | Technique                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| signataire   | A sculpted hand in a suit sleeve works through contracts on a dark desk: strikes a phrase, initials the margin, signs, underlines, lifts away; the page slides off, the next comes in. The camera leans in while it signs. | Three.js. The WebXR generic hand (`public/models/hand-right.glb`, immersive-web/webxr-input-profiles, MIT), posed into a tripod grip by forward kinematics on its flat joint list (`?grip` shows the grip from four sides; `?grip={json}` overrides it). Pages are canvas textures; ink is ribbon geometry revealed by draw range. Everything is a function of time in a loop. |
| loupe        | The headline as a poster of heavy letters made of fine print (the contract's clauses, drifting); a loupe magnifies it so it can be read.                                                                                   | Canvas 2D: glyph mask, pre-set rows of fine print clipped to it, the lens re-set at 3.2× so it stays sharp. The h1 is visually hidden; the visible headline is drawn.                                                                                                                                                                                                          |
| confidentiel | A dark file; the approved figures are blacked out on load; an ultraviolet lamp (the cursor, or wandering) makes them fluoresce, with a watermark. The clients row only ever reads "Confidentiel".                          | Two identical DOM layers; the ultraviolet one masked to the lamp's circle with CSS custom properties set per frame. Figures verbatim from the brief, FR and EN.                                                                                                                                                                                                                |
| pile         | 300 sheets land into a ream (the "300 contrats" figure, label still open) with a counter keeping pace; the top sheet is the signed contract; the cursor riffles the ream open.                                             | Three.js instanced mesh, per-sheet transforms from time and riffle level; the cover reuses signataire's printed page and strokes.                                                                                                                                                                                                                                              |
| salle        | Paris in hairlines draws itself upwards; three screens of pinned scroll fly one camera move over the roofs, through a lit window, onto the table where two lines meet.                                                     | Three.js line segments, all generated (Haussmann blocks, mansards, dormers, chimneys, the Eiffel Tower); a reveal clip by world height; Catmull-Rom camera and aim paths driven by ScrollTrigger progress.                                                                                                                                                                     |

### Hero studies, round 2 (redline, accord, rapport)

The round-1 heroes were all one composition (headline top-left / bottom-right, an ornament between)
and put the signature, the story's ending, at the start. Round 2 tries three directions where the
hero shows the negotiation itself. Each is a self-contained variant (switcher keys 1–3, `/lab/<name>`);
faces that only they use load from `hero/study-fonts.ts` (Newsreader, Geist Mono, Archivo with its
width axis). WebGL is allowed for this round.

| Variant | Direction                             | What happens                                                                                                                                                                                                                                                                                                                                                                                    | Technique                                                                                                                                                                                                                                                                      |
| ------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| redline | Le Dossier: the site is a contract    | A contract tilts up off the table; a red pen strikes a term and writes the new one in; every clause is struck in a wave from where the pen lifted, except the words that spell the headline, which lift out and set themselves large; the pen underlines "signature". Rest on a clause to read it back.                                                                                         | Contract in `messages` (`heroStudies.redline.contract`, `<k>` kept words, `<e>before\|after</e>` edits, read raw); strikes are seeded SVG paths measured from `getClientRects()` with the sheet flat, drawn with DrawSVG; headline words FLIP from the kept words; CSS 3D tilt |
| accord  | L'Accord: negotiation as resonance    | Two strings come in from the edges out of tune (noise, phosphor trails) and the headline jitters in two copies; cursor to the centre tunes them, holding locks: light runs out from the centre, the headline focuses, the string comes to rest flat. Auto-tunes after a few idle seconds; scroll locks at once, then the line retracts and drops down the page. Optional sound, off by default. | Fragment shader (`accord-signal.ts`) driven by a GSAP ticker loop; WebAudio fifth (`accord-sound.ts`), started only by the visitor                                                                                                                                             |
| rapport | Rapport de force: type under pressure | A line splits the band into a peach and a black field; the headline is a poster across both, inverted at the line. Drag the line: the side gaining ground stretches its letters (wdth 125), the losing side is squeezed (wdth 62, heavier); release and it returns to even. Scroll gives the band to the peach side.                                                                            | Two clipped poster layers; per-letter advances measured at three wdth values and interpolated, so each frame lays out without DOM reads; rows refit to the measure every frame                                                                                                 |

Every study has a reduced-motion branch that renders its settled state.

## Checklist for a new animated section

1. One motion idea. It explains something (a figure, a change of side, a sequence).
2. Works as a still page; reduced-motion branch present.
3. Tokens only (`EASE`, `DURATION`); no gradients, blur, video or 3D (the round-2 hero studies are
   an agreed exception while a direction is chosen).
4. Hidden start state in CSS behind `data-state="pending"`.
5. Mobile: shorter or simpler; pinned sequences capped.
