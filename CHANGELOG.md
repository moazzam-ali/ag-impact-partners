# Changelog

All notable changes to this project. Newest first.

## Unreleased

### Added (ideation)

- Hero studies, round 2, first in the switcher (keys 1–3, `/lab/<name>`): **redline** (a contract on paper; a red pen edits it, every clause is struck except the words that spell the headline, which lift out and set themselves large; rest on a clause to read it back), **accord** (WebGL: two detuned strings tune into one line as the cursor nears the centre, then drop down the page as the thread; optional sound, off by default) and **rapport** (a peach / black split; dragging the line stretches one side's letters and squeezes the other's on Archivo's width axis). Faces for these only in `hero/study-fonts.ts`; `--paper` and `--pen` tokens.
- Five signature hero variants (hello, plume, griffe, fil, sceau) on a shared `SignatureShell`, each with its own interaction, desktop only; review pages at `/lab/<name>`, a variant switcher pill (keys 1–7) on the home page, `?hero=<name>`.
- `[data-theme="light"]` palette block, so a section can be light on the dark-default page.
- Figma hero variant (frame 1:155): the signature line through "ag impact partners", smoothed and written in pen order.

### Changed

- The active hero is now "redline"; the switcher takes key 0 for the tenth variant.
- Every hero variant now raises both headline lines first and starts its signature while they rise (`SIGNATURE_INTRO` in the shell); griffe no longer holds line 2 back until the scroll-signing ends.
- The header switches to the light palette over a light hero.
- Sizing now follows the Proxy Papers system: a `--scale` unit from the 1512px artboard, a `clamp()` type ramp, a fixed spacing scale, shared radii, gutters and motion curves (`src/styles/tokens.css`). Header, buttons and sections use them.
- The hero's drawn signature is replaced by the light cables shader on a dark band (hero variant "cables"; variants are registered in `src/components/sections/hero/variants.ts` and switchable with `?hero=`); dark is the default theme. The signature font, geometry and the DrawSVG / MotionPath plugins are gone.

### Added

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
