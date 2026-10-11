# Conventions

How this codebase is organised and written. Read before the first commit. When this doc and the code
disagree, fix one of them in the same PR.

## Stack

| Concern   | Choice                                                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework | Next.js 16, App Router, `src/` dir, TypeScript strict (`noUncheckedIndexedAccess` on), React Compiler on, Cache Components off for now                                                                                       |
| Styling   | Tailwind CSS 4 through `@tailwindcss/postcss` (CSS-first config in `src/styles/globals.css`) + CSS Modules for component geometry and motion. Not the `@tailwindcss/turbopack` loader: its `*.css` rule flattens CSS Modules |
| Tokens    | `src/styles/tokens.css`: AG colours, Proxy Papers sizing (scale unit, type ramp, spacing, radii, gutters, motion); mapped to Tailwind utilities with `@theme inline`                                                         |
| i18n      | next-intl 4: `messages/fr.json` (source), `messages/en.json`; FR at `/`, EN at `/en`                                                                                                                                         |
| Theme     | next-themes on `data-theme` (light default, dark = the Noir direction)                                                                                                                                                       |
| Motion    | GSAP 3 + ScrollTrigger via `@gsap/react` (`useGSAP`); WebGL fragment shaders for the light cables and accord; Three.js for the round-3 3D hero studies (signataire, pile, salle)                                             |
| Fonts     | `next/font/google`: Instrument Sans (variable)                                                                                                                                                                               |
| Tooling   | npm, Node 22 (`.nvmrc`), ESLint 9 flat config + `eslint-config-next`, Prettier + Tailwind class sorting                                                                                                                      |

Keep dependencies few. Before adding one, check it is not already covered (clsx + tailwind-merge
for classes, next-intl for formatting dates and numbers, GSAP for all motion).

## Folder layout

```
messages/                 fr.json (source of truth), en.json
public/brand/             client logo SVGs, as delivered
docs/                     conventions, systems, reference, brief, concepts
src/
  app/[locale]/           routes only: layout, page, not-found, [...rest]
  components/
    brand/                logo marks
    layout/               header, footer, page shells
    sections/<page>/      one folder per page's sections (hero, home, expertise, …)
    motion/               reusable motion primitives (Words, …)
    ui/                   small reusable controls (buttons, switches)
    providers.tsx         client providers (theme)
  config/                 site.ts: structure and switches (never copy, never colours)
  hooks/                  generic hooks only; feature hooks live next to their feature
  i18n/                   routing, navigation, request config
  lib/                    pure helpers; lib/motion/ is the GSAP layer
  styles/                 globals.css, tokens.css
  types/                  ambient declarations
  proxy.ts                next-intl locale proxy (Next 16's name for middleware)
```

Rules:

- One folder per section, files colocated: `home-hero.tsx`, `home-hero.module.css`.
- No barrel `index.ts` files. Import the file.
- Feature-specific hooks and helpers sit next to the feature (in its section folder), not in
  `src/hooks`, which is for generic hooks only.
- `src/config` is for structure and switches. Copy goes in `messages/`, colours in `tokens.css`.

## Naming

- Files and folders: `kebab-case`. Components: `PascalCase` named exports (`export function HomeHero`).
  Default exports only where Next requires them (pages, layouts, proxy, request config).
- Hooks: `use-thing.ts` exporting `useThing`. CSS Modules: `thing.module.css` imported as `styles`.
- Data attributes for GSAP targets (`data-title`, `data-stroke`, `data-word`), never CSS Module
  class names, which are hashed.
- Message keys: `namespace.key`, camelCase, grouped by section (`hero.title1`, `nav.cta`).

## Components

- Server Components by default. Add `"use client"` only for hooks, event handlers, GSAP, browser APIs.
  Keep client components leaf-sized: the page and section shells stay on the server.
- Props typed inline or as `type XProps`. React 19: `ref` is a plain prop, no `forwardRef`.
- Accessibility is part of done: real buttons and links, `aria-pressed` for toggles, `aria-label`
  from messages, decorative art `aria-hidden` with an `sr-only` description when it carries meaning.
- Copy never appears in JSX. Everything goes through `useTranslations` / `getTranslations`, even
  labels only developers will see.

## Sizing system (from Proxy Papers, until a design system exists)

- **Scale unit** `--scale: min(100vw / 1512, 1px)`: one design pixel of the 1512px artboard,
  proportional below 1512 and frozen above. Use it for things measured in Figma that should shrink
  with the viewport but never grow: button padding and text, nav pill, small chrome.
  `calc(16 * var(--scale))`.
- **Type ramp** `--text-cover … --text-xs`, all `clamp()` except body/sm/xs. `d1` and `d2` cap at
  the Figma hero sizes (95 / 76). Headings use the ramp, never ad-hoc pixel sizes. With Tailwind:
  `text-(length:--text-h1)`; `text-xs|sm|base` are mapped to the ramp.
- **Spacing** `--space-1 … --space-34` (4, 8, 12, 16, 20, 24, 32, 40, 48, 60, 66, 80, 92, 120, 137).
  Tailwind's 4px scale covers the regular steps; the odd ones are tokens: `py-(--space-30)`.
- **Layout** `--page-gutter` (78px at 1512, fluid below), `--page-max` 1360 for text content,
  `--frame-max` 1512 for full-width compositions, `--nav-height`, `--tap` 44 for anything clickable.
- **Breakpoints** mobile ≤ 767, tablet ≤ 1023 (`MOBILE_QUERY`, `TABLET_QUERY` in
  `src/lib/motion/tokens.ts`; Tailwind `md:` / `lg:`).
- **Radii** xs 2, sm 8, md 13, lg 20, pill. Buttons, the nav pill and the switches are all pills. **Motion** `--ease-out`, `--ease-standard`,
  `--dur-fast|base|slow`.
- **Buttons** are `ButtonLink` (`src/components/ui/button-link.tsx`): 10 × 20 scale units of
  padding, 16 scale units of text, pill radius, text-roll hover. No other button styles.

## Styling

- Tailwind utilities for layout, spacing, type and colour in ordinary components.
- CSS Modules when a component is mostly geometry or motion state (the hero, the header, buttons).
  Inside modules use the tokens (`var(--accent)`, `var(--space-6)`), not raw values.
- Never hardcode a colour. Add a token to `tokens.css` (both themes) and map it in `globals.css`.
- The dark palette is `[data-theme="dark"]`, which next-themes sets on `<html>`; a section can opt
  in by setting the attribute itself (the hero does, because the cables need a black ground).

## Copy and content rules (from the brief)

- Figures verbatim, never rounded; no founding date anywhere. Banned phrases are listed in
  `docs/brief/site-structure.md` ("Copy rules"). Facts before adjectives, "vous" never "tu", no
  superlatives, emoji or exclamation marks.
- Open client decisions are switches in `src/config/site.ts` (logo wall A/B/C, Ligue 1+ attribution,
  "300 contrats" label, contact form vs direct). Build both branches, flip one line later.
- French is the source language. Add a key to `fr.json` first, then `en.json`. The TypeScript types
  come from `fr.json`, so a missing EN key is a type error, not a runtime surprise.

## Motion

See [systems/motion.md](systems/motion.md). In short: import from `@/lib/motion/gsap`, use the
tokens, write every intro inside `gsap.matchMedia()` with a reduced-motion branch, hide the start
state in CSS behind `data-state="pending"`, one motion idea per section.

## Git

- Branch names describe the work: `hero-variants`, `expertise-page`, `fix/header-overlap`.
- Commit messages: imperative, present tense, one change per commit. Optional type prefix
  (`feat:`, `fix:`, `docs:`, `chore:`) when it helps scanning.
- Before every PR: `npm run check` passes, `CHANGELOG.md` has an entry, docs touched by the change
  are updated in the same PR.
- Never commit `.env*`, editor settings or local tooling files.

## Scripts

| Script                            | Does                                         |
| --------------------------------- | -------------------------------------------- |
| `npm run dev`                     | Dev server (Turbopack)                       |
| `npm run build` / `npm start`     | Production build and serve                   |
| `npm run typecheck`               | Regenerates route types, then `tsc --noEmit` |
| `npm run lint` / `lint:fix`       | ESLint                                       |
| `npm run format` / `format:check` | Prettier                                     |
| `npm run check`                   | typecheck + lint + format:check              |
