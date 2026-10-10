# AG Impact Partners — website concepts, handoff

Devtrox for AG Impact Partners (Paris consultancy: negotiation in telecoms, media, distribution, content, purchase-contract optimisation). This folder holds the two concept pages built so far, the thinking behind them, and what's left to decide. Both pages are single self-contained HTML files; open them in a browser or serve the folder.

```
ag-impact/
├── HANDOFF.md          this file
├── directions.html     three full art directions (Noir / Blanc / Pêche), hero + two chapters each, in-page switcher
└── signature.html      the Figma hero layout with an "AG" signature stroke in three renderings, in-page switcher
```

Source of truth for copy, structure and rules: `AG_Impact_Site_Structure.md` (Draft 1, 10 Oct 2026). Everything below follows it.

---

## 1. What the site is

- 4 pages (Accueil, Expertise, Références, Contact) + 2 legal pages. French at launch, English later.
- Homepage tells the whole story in six moves: what we do → why us → what we cover → proof → who you'll talk to → the ask.
- Headline (approved): **Nous négocions. Jusqu'à la signature.** / EN: We negotiate. All the way to signature.
- Motion system: **"Le fil"** — one thin line, born in the hero where two lines slide in from opposite edges and meet (two sides of a table), runs down every page as a vertical thread, bends into each section's key moment, and ends every page as a signature stroke above the contact line.
- Motion rules from the brief: one motion idea per section; motion explains (a figure, a change of side, a sequence), never decorates; no gradients, no blurred shapes, no video, no heavy 3D; slow and precise easing, nothing bounces; every section works as a still page; reduced-motion gets the static version; SVG + CSS + GSAP ScrollTrigger only; simpler on mobile.
- Copy rules: facts before adjectives; figures exactly as given (no rounding, no stronger labels, no founding date anywhere); industry terms unexplained; "vous" never "tu"; no superlatives, emoji or exclamation marks. Banned phrases: partenaire de confiance, acteur incontournable, expertise unique, solution clé en main, équipe passionnée et engagée, solutions innovantes et sur mesure, au cœur de, à l'ère du digital, accompagnement sur mesure, catalogue de prestations.
- Layout rules: no stock imagery; no cards, no price-list look, no three-offers-side-by-side; the five pillars in their fixed order (01 Télécom, 02 Média, 03 Distribution, 04 Contenus, 05 Optimisation des contrats d'achat); logos monochrome only; one portrait on the whole site (Tatiana Agova-Bregou, Expertise page); no team names/faces/org chart.

### Approved figures (use verbatim)

- 25 ans · d'expérience dans ces cinq domaines, au niveau direction générale
- Plus d'1 milliard d'euros · de droits et de contenus négociés
- 300 contrats · négociés _(label scope still open, decision 16 Oct)_
- 10 à 30 % · d'économies obtenues sur les contrats d'achat renégociés · Rémunération au résultat
- Plus d'un million d'abonnés en moins d'un mois (Ligue 1+ · LFP Media) _(attribution wording pending: "a contribué au lancement" vs "a accompagné le succès")_
- 31 millions · de foyers français encore équipés d'une box TV d'opérateur · Chiffre de marché (Expertise page only, must be labelled as a market figure)

### Open items that block launch, not design

Email + direct line · Tatiana's portrait (before 19 Oct) · logo wall option A/B/C (12 Oct) · written consent per brand/client name · Ligue 1+ attribution (16 Oct) · "300 contrats" label (16 Oct) · former employers named or described · direct contact vs form (30 Oct) · legal notice content · final logo direction (sets the colours and how the thread looks).

---

## 2. `directions.html` — three art directions

Palette constraint given for this round: a black alternative, a white alternative, and an orange/peach complement; tech feel; immersive animated layouts. Each direction = full-height hero + two scroll-pinned chapters + a closing strip where the thread ends in a signature stroke. Only one direction is mounted at a time; the floating pill switches them (keys 1/2/3 also work; choice persists in `localStorage` and `#noir|#blanc|#peche` in the hash).

### Tokens

|                 | Noir · Le fil                     | Blanc · La table                                   | Pêche · La signature                    |
| --------------- | --------------------------------- | -------------------------------------------------- | --------------------------------------- |
| bg              | `#000000`                         | `#FFFFFF`                                          | `#FFAB7A`                               |
| ink             | `#F4F1EC`                         | `#000000`                                          | `#000000`                               |
| mute            | `#8C8780`                         | `#8A847D`                                          | `#7A2E0E`                               |
| rule            | `#262321`                         | `#E7E2DC`                                          | `#E68A58`                               |
| accent (thread) | `#FFB088`                         | `#FF9E70`                                          | `#000000`                               |
| accent2         | `#FF7A3D`                         | `#E55A1F`                                          | `#FFF4EC`                               |
| paper (band)    | `#F4F1EC`                         | `#F5F2EE`                                          | `#FFF4EC`                               |
| display face    | Archivo (wdth 106–125, 800 / 300) | Bricolage Grotesque (opsz 96, wdth 86–92, 200–300) | Big Shoulders Display (900 / 500, caps) |
| body face       | Archivo                           | Instrument Sans                                    | Figtree                                 |

Tokens live on `:root` and are overridden by `body[data-dir="…"]`. Fonts from Google Fonts in one `<link>`.

### Shared mechanics

- **Hero intro**: `.meet` holds two 1px lines (`i.l`, `i.r`, scaleX 0→1 from each edge) and a dot `b` at the meeting point; headline words are split into `.w > span` and rise from `yPercent: 112`; sub-line, eyebrow and buttons fade up last.
- **Spine**: `.spine` is a 1px absolute line in each `.dir`, `left: var(--spine)` (50%), `top` set in JS to the meeting line's y, `scaleY` scrubbed 0→1 over the whole direction with ScrollTrigger. It paints _below_ later siblings (no z-index), so any element with a background interrupts it — text blocks that cross it get `background: var(--bg); width: fit-content` to read as "stitched through".
- **Pinned chapters** use `ScrollTrigger` with `pin: true, scrub`, `end: '+=160–260%'`.
- **Closing strip**: `.sig path` (one hand-drawn-ish SVG path, 420×140 viewBox) drawn via stroke-dashoffset when the strip enters.
- **Canvases**: `makeCanvas(canvas, draw)` handles DPR, resize, pointer tracking and a frame loop that only runs while the hero is on screen (`watchHero`). `prefers-reduced-motion` renders one static frame.
- **Direction lifecycle**: `window.AGI.dirs[name](root)` mounts a direction inside a `gsap.context` and returns a cleanup; the switcher reverts the context, kills canvases/listeners, hides the section, scrolls to top, mounts the next one and calls `ScrollTrigger.refresh()`.
- Header hides on scroll down, returns on scroll up. Mobile: nav links hidden, grids collapse to one column, figures still 2×2 around the spine.

### Noir · Le fil

Hero: pure black, dot-grid canvas (28px gap) that ripples once from the meeting point and brightens near the cursor; headline in two weights (800 "Nous négocions." / 300 wide "Jusqu'à la signature."). Chapter A2 _Ce que nous négocions_: pinned, four phrases swap one at a time on the right of the spine, statement on the left, client-type ticker at the bottom. Chapter A4 _En chiffres_: four figures 2×2 around the spine (inner edges aligned to it), count up once on enter, labels fade in after.

### Blanc · La table

Hero: white, crosshair-grid canvas whose marks rotate toward the cursor; the whole headline scene tilts in 3D with the pointer; "Nous négocions." sits above the table line (left), "Jusqu'à la signature." below it (right). Chapter A3 _Ce qui nous distingue_: pinned; the line is the pivot, the headline flips over it (rotateX −180) to reveal the body and "Nos interlocuteurs décrochent." on the other side; the axis thickens at 90° like an edge-on table. Chapter A5 _Cinq domaines_: five SVG lines weave across each other then settle into the five rows; hovering a row thickens its line to accent and slides the description in.

### Pêche · La signature

Hero: full peach, condensed caps headline on three lines; the canvas is a field of ~250 thin bars: two halves slide in from the edges and meet, then settle into a waveform that reacts to the cursor. Chapter A6 _Optimisation des contrats d'achat_ (paper band): pinned; the "Contrat actuel" bar shortens to 90 % and a hatched −30 % → −10 % zone appears (real range only, never a single invented number); "10 à 30 %" counts once. Chapter A8 _Ligue 1+_: pinned; three story beats light up in turn, then the number counts to 1 000 000 as a line fills to "abonnés en moins d'un mois".

### Dependencies

GSAP 3.12.5 + ScrollTrigger from cdnjs. Everything else is inline.

---

## 3. `signature.html` — the Figma hero with an "AG" signature

Layout implemented 1:1 from the Figma frame _MacBook Pro 14' – 1_ (`R10TRadHemcHKlFgCnBgAM`, node `1:2`, 1512 × 982):

| element     | spec                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| background  | `#f2f2ee`                                                                                                               |
| logo circle | 54 px, `#e6e6e2`, at (78, 44); mark slot 28 × 20 centred, offset −1 px                                                  |
| nav pill    | `#e6e6e2`, radius 40, padding 15/30, gap 40, Instrument Sans Medium 20 px, `#000` — home · product · services · contact |
| CTA         | "Get in touch", `#dd7d57`, radius 10, padding 12/20, Medium 20 px, `#000`, at x 1282 (right gutter 78)                  |
| title 1     | "We negotiate." Instrument Sans SemiBold 76 px, tracking −0.03em (−2.28 px), `#191a23`, left 78, top 229                |
| title 2     | "All the way to signature." Medium 61 px, tracking −0.03em (−1.83 px), right 78, top 788                                |

Everything is sized from `--px: calc(100cqw / 1512)` inside a container-query wrapper, so the frame scales with width. On short viewports the stage height is clamped to `100svh − 96px` (room for the switcher) and the stroke is scaled uniformly by height and centred, never squashed. Under 900 px it becomes a stack: nav, title 1, signature box, title 2.

### The stroke

One path in a 1512 × 982 space, starting just right of the period of "We negotiate." and ending at the first letter of "All the way to signature.": lead-in down, the A as a sharp peak (the brand mark is a peak), a small crossbar loop, the G as a round loop with an inward hook, then a flourish that sweeps right and lands on the second title.

```
M590 302 C 560 330, 548 470, 572 600 C 566 650, 600 560, 640 450 C 680 340, 700 300, 712 318
C 740 360, 790 530, 822 640 C 834 680, 810 690, 796 660 C 740 560, 660 520, 640 545
C 625 565, 680 575, 740 555 C 830 525, 880 435, 940 445 C 1040 460, 1060 560, 1020 640
C 985 705, 880 705, 858 635 C 846 595, 900 565, 962 578 C 1070 600, 1180 640, 1160 720
C 1140 790, 980 790, 826 778
```

The path is sampled once every 2 units (`getPointAtLength`) into points with normals; the three renderers all draw from the same samples, so switching never changes the composition. Pen pressure along the stroke: `profile(t) = (0.45 + 0.55·sin(2π·3.1·t + 0.9)) · taper`, thin at lift-off and landing.

### The three renderings (switcher, keys 1/2/3, persisted)

- **Trait** — one calligraphic stroke: filled circles along the samples, radius `1.5 + 7.4·profile(t)`; terracotta touchdown dot at the start.
- **Fil** — 14 hairlines offset along the normals (gap 1.7 units, line 4 terracotta), a slow sine wobble, and a Gaussian spread around the cursor (σ ≈ 120 px) that opens the bundle.
- **Trame** — a dot grid (11 units) over the stage; cells within the pressure radius of the stroke are lit in pen order, core dots ink, rim dots terracotta, cursor warms and enlarges nearby dots; the rest of the grid stays as a faint field.

Intro: nav (0.1 s) → title 1 words (0.25 s) → the pen writes for 2.3 s (from 1.0 s) → title 2 words (2.75 s) → switcher (3.3 s). Switching replays the writing only. No libraries; plain canvas and CSS transitions.

### Known gap

The logo mark (`AG-Impact_Peak_mark_charcoal`) couldn't be fetched from the Figma asset endpoint. `.mark` is a labelled "AG" stand-in at the exact 28 × 20 slot — replace its contents with the SVG (`data-asset` attribute marks the spot).

---

## 4. Decisions so far, and what's next

Decided in these rounds

- Keep "le fil" as the single motion motif in every direction; the thread is the brand gesture, the signature is its ending.
- The signature reads as "AG" built from the brand's peak, not as handwriting of the full name.
- Copy on every concept page is the brief's own French (or the Figma's English for the hero); nothing invented beyond the proposed lines in the structure doc.

To decide with the client

- Direction: Noir / Blanc / Pêche, or a blend (e.g. Blanc's layout with Noir's thread colour). The final logo direction sets the colours.
- Which signature rendering ships (Trait is the most "senior firm", Trame the most "tech", Fil the most alive).
- Whether the hero headline is two lines of contrasting weight (Noir) or one weight.

Suggested next build steps

1. Pick one direction + one signature rendering, then rebuild the homepage sections A1–A10 from the structure doc in the production stack (Next.js + GSAP ScrollTrigger, as on previous Devtrox sites), reusing the mechanics here: `.meet` intro, `.spine` scrub, pinned chapters, `makeCanvas`, the closing `.sig` stroke.
2. Keep every chapter readable as a still page and give reduced-motion the static version (already handled in both files with `prefers-reduced-motion`).
3. Build the switches the doc asks for as real switches: logo wall A/B/C, Ligue 1+ attribution A/B/fallback, "300 contrats" label, direct contact vs form.
4. Replace the stand-in mark with the real SVG; load Instrument Sans (or the chosen direction's faces) self-hosted for the client's load-time check.
5. Mobile: shorter pinned sequences, the fixed bottom action bar (Écrire · Appeler) after the hero.
