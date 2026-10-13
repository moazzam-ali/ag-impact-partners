# Changelog

All notable changes to this project. Newest first.

## Unreleased

### Added

- Home A2 "Ce que nous négocions": the four negotiated items take turns on a sticky stage, standing on a contract-field hairline that counts the steps; the statement, and the client types drifting as a quiet text-only line. A still page for reduced motion, no script and short screens.
- Home A3 "Ce qui nous distingue": the headline stands on a full-bleed table line that tips as you scroll; it turns over the edge and comes back from the other side, and the pull line swings out from underneath.

### Removed

- Every hero but Pile 2: the signature variants, light cables, the five rounds of hero studies, their lab pages, the hero variant switcher, the round-5 images, the hand model and the study fonts. All of it is kept on the `archive/hero-studies` branch. Pile 2 is the homepage hero; its copy is the `pile` namespace.

### Added (ideation)

- Six more curtain styles, all building the traced lockup with the wordmark (the mark traced shape by shape, the wordmark rising, a hairline loader): **esquisse** (a paper proof, then a mark-shaped window), **iris** (an inverted disc that closes onto the mark, and opens from the clicked link on page changes), **biais** (a panel leaving on the A's angle), **feuille** (one sheet with an accent rim) and **tourne** (a page turn). Page transitions are one movement and carry no logo: a sweep to the next page; links are prefetched when pointed at.
- Splash and page transitions ("the curtain"), three styles to choose from with the "Rideau" pill or `?curtain=`: **fil** (the screen parts along a hairline), **sommet** (the page seen through the mark, zooming open) and **feuillets** (sheets slide up and lift away). Logo build-up from the real logo split into parts, a loader tied to fonts and page load, page intros held until the reveal. A simple `/expertise` page to switch to.
- Hero study **pile2**, first in the switcher (key 1, `/lab/pile2`): Pile redone in Instrument Sans at poster size with the ream standing on the headline; a shorter, calmer build; any sheet can be pulled out and laid on top, a different document each time (five designs, one per field) with a leader line naming its field; "le fil des domaines", a slim running line of the five fields as small cards with animated line icons; follows the site's dark and light themes.
- Hero studies, round 5, first in the switcher (keys 1–5, `/lab/<name>`): image-led intros with the full brief copy. **cadre** (full-bleed pictures of the five fields with a field timeline), **index** (the fields as an index, a picture trailing the cursor), **editorial** (a magazine-cover layout with the approved figures), **diptyque** (two pictures meeting at a peach line) and **fenetres** (the fields seen through the headline's letters, a scroll dive through the O). Eight project images in `src/assets/hero/` (generated, client approval pending).
- Hero studies, round 4, first in the switcher (keys 1–4, `/lab/<name>`): **table** (the negotiation across a walnut table, two hands and two inks, both parties sign), **popup** (Paris rises out of a pop-up book in cut paper), **dossier** (a leather portfolio whose pages turn on scroll through the five fields to the signed contract) and **macro** (a fountain pen's nib writing the signature in wet ink, in macro, then the pull back).
- Hero studies, round 3, first in the switcher (keys 1–5, `/lab/<name>`): **signataire** (a 3D hand in a suit sleeve signs contract after contract on a dark desk), **loupe** (the headline as letters made of fine print, with a loupe to read it), **confidentiel** (approved figures under redaction, revealed by an ultraviolet lamp; the clients stay confidential), **pile** (300 contract sheets land into a ream you can riffle) and **salle** (Paris in hairlines, a pinned scroll flight through a lit window to the table). Three.js added; the WebXR generic hand model (MIT) in `public/models/`.
- The variant switcher wraps, marks each round with a divider and keys only the first ten.
- Hero studies, round 2, first in the switcher (keys 1–3, `/lab/<name>`): **redline** (a contract on paper; a red pen edits it, every clause is struck except the words that spell the headline, which lift out and set themselves large; rest on a clause to read it back), **accord** (WebGL: two detuned strings tune into one line as the cursor nears the centre, then drop down the page as the thread; optional sound, off by default) and **rapport** (a peach / black split; dragging the line stretches one side's letters and squeezes the other's on Archivo's width axis). Faces for these only in `hero/study-fonts.ts`; `--paper` and `--pen` tokens.
- Five signature hero variants (hello, plume, griffe, fil, sceau) on a shared `SignatureShell`, each with its own interaction, desktop only; review pages at `/lab/<name>`, a variant switcher pill (keys 1–7) on the home page, `?hero=<name>`.
- `[data-theme="light"]` palette block, so a section can be light on the dark-default page.
- Figma hero variant (frame 1:155): the signature line through "ag impact partners", smoothed and written in pen order.

### Changed

- Pile 2: the same small gap above and below the ream, more room above the eyebrow and before the line of fields, more room between the ream and the callout, a wider container (1720px), and the hero is as tall as its content instead of one screen. The callout keeps one height for every field and sets a long name (purchase contract optimisation) a size down on two lines. Removed the hover tag, the callout's hint and its "a sheet at random" link, the line of fields' "Five fields" label and its outline on the field on top.
- Motion follows Proxy Papers' conventions, now the project's (docs/systems/motion.md, "Animation conventions"): shared `EASE_OUT` / `EASE_STANDARD` / `scheduleRefresh`, one hook per section in `src/lib/animations/`, client-navigation state for intro delays. Pile 2, its line of fields and the Expertise page are rebuilt on it (rows reveal on scroll); the curtains are retimed to the same curves, sommet's mark pops in like Proxy Papers' icon, and page changes are its bending sheet with the mark rising in between.
- The active hero is now "signataire" (was "redline"); the switcher takes key 0 for the tenth variant.
- Every hero variant now raises both headline lines first and starts its signature while they rise (`SIGNATURE_INTRO` in the shell); griffe no longer holds line 2 back until the scroll-signing ends.
- The header switches to the light palette over a light hero.
- Sizing now follows the Proxy Papers system: a `--scale` unit from the 1512px artboard, a `clamp()` type ramp, a fixed spacing scale, shared radii, gutters and motion curves (`src/styles/tokens.css`). Header, buttons and sections use them.
- The hero's drawn signature is replaced by the light cables shader on a dark band (hero variant "cables"; variants are registered in `src/components/sections/hero/variants.ts` and switchable with `?hero=`); dark is the default theme. The signature font, geometry and the DrawSVG / MotionPath plugins are gone.

### Added

- Favicons from the mark (`npm run favicons`, `scripts/favicons.mjs`): an SVG tab icon that follows the browser's light or dark chrome, `favicon.ico` (16/32/48 on a black tile), the Apple touch icon, and 192/512/maskable icons in a web manifest (`src/app/manifest.ts`).
- Smooth scrolling with Lenis, driven by GSAP's ticker and synced with ScrollTrigger; held while the curtain covers the page, off with reduced motion.
- `ButtonLink`, the site's one button (scale-unit padding, text-roll hover).
- `LightCables` (`src/components/motion/light-cables.tsx`), adapted from Originkit: on-screen-only loop, reduced-motion still frame, token colours, plus a standing `curve`, `feedIn` / `feedOut` and `originGlow` controls so the hero has its S-shape without hover.

- Project scaffold: Next.js 16 (App Router, TypeScript strict, React Compiler), Tailwind CSS 4, ESLint 9 + Prettier.
- Internationalisation with next-intl: French at `/`, English at `/en`, type-safe message keys, locale-aware `Link` / `useRouter`.
- Light / dark theme with next-themes on `data-theme`; all colours as CSS tokens in `src/styles/tokens.css`.
- Font via `next/font/google`: Instrument Sans (variable).
- Motion foundation: single GSAP entry (`src/lib/motion/gsap.ts`) with ScrollTrigger; motion tokens; word-reveal primitives.
- Site header from the Figma: logo circle with the Peak mark, nav pill, CTA; hides on scroll down.
- Homepage hero from the Figma frame: two headline lines joined by a drawn signature stroke that writes "ag impact partners", with a pen dot and word reveals. Two alternative renderings (a pointed-pen "AG" monogram and a dot-grid version) were explored and dropped before the first commit.
- Brief, concept pages and brand SVGs versioned under `docs/` and `public/brand/`.
