# AG Impact Partners

Marketing site for AG Impact Partners, a Paris consultancy (negotiation in telecoms, media,
distribution, content and purchase-contract optimisation). Next.js 16 App Router, French first with
English behind `/en`, deployed on Vercel.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
```

Copy `.env.example` to `.env.local` for local overrides. See
[docs/reference/environment-variables.md](docs/reference/environment-variables.md).

```bash
npm run build          # production build
npm run check          # typecheck + lint + format check (run before every PR)
npm run format         # prettier --write
```

## Where things are

- [docs/README.md](docs/README.md) — documentation index
- [docs/conventions.md](docs/conventions.md) — how the codebase is organised and written (read first)
- [docs/brief/](docs/brief/) — the client brief: site structure (source of truth for copy) and the concept handoff
- [docs/concepts/](docs/concepts/) — the two concept pages built before this repo (art directions, signature studies)
- [CHANGELOG.md](CHANGELOG.md)

## Hero

The homepage hero is the Figma composition: the headline on two lines joined by one signature stroke
that writes "ag impact partners". Geometry lives in `src/components/sections/hero/signature-paths.ts`;
see [docs/systems/motion.md](docs/systems/motion.md).
