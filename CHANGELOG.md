# Changelog

All notable changes to this project. Newest first.

## Unreleased

### Added

- Project scaffold: Next.js 16 (App Router, TypeScript strict, React Compiler), Tailwind CSS 4, ESLint 9 + Prettier.
- Internationalisation with next-intl: French at `/`, English at `/en`, type-safe message keys, locale-aware `Link` / `useRouter`.
- Light / dark theme with next-themes on `data-theme`; all colours as CSS tokens in `src/styles/tokens.css`.
- Fonts via `next/font/google`: Instrument Sans (UI) and Ms Madi (signature stand-in for the Figma's Maddison Signature).
- Motion foundation: single GSAP entry (`src/lib/motion/gsap.ts`) with ScrollTrigger, DrawSVG and MotionPath; motion tokens; stroke geometry and canvas helpers.
- Site header from the Figma: logo circle with the Peak mark, nav pill, CTA; hides on scroll down.
- Homepage hero from the Figma frame: two headline lines joined by a drawn signature stroke that writes "ag impact partners", with a pen dot and word reveals. Two alternative renderings (a pointed-pen "AG" monogram and a dot-grid version) were explored and dropped before the first commit.
- Brief, concept pages and brand SVGs versioned under `docs/` and `public/brand/`.
