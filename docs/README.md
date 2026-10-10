# Documentation

Start here. Everything about how this site is built lives in this folder; the client brief is the
source of truth for what it says.

## Index

| Doc                                                                      | Covers                                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [conventions.md](conventions.md)                                         | Stack, folder layout, naming, styling, i18n, motion, theming, review checklist                             |
| [systems/motion.md](systems/motion.md)                                   | The "le fil" motion system in code: GSAP setup, the hero stage, the three signature renderers              |
| [reference/environment-variables.md](reference/environment-variables.md) | Every env var: purpose, scope, where to set it                                                             |
| [brief/site-structure.md](brief/site-structure.md)                       | Client brief, Draft 1 (10 Oct 2026): every page and section, approved copy, motion per section, open items |
| [brief/handoff.md](brief/handoff.md)                                     | Handoff from the concept round: directions explored, signature studies, decisions and next steps           |
| [concepts/](concepts/)                                                   | `directions.html` (Noir / Blanc / Pêche) and `signature.html` (three signature renderings), self-contained |

## Conventions for docs

- `systems/` — one file per subsystem: how it works, why, what to watch when changing it.
- `guides/` — task-oriented how-tos, short and step-numbered.
- `reference/` — exhaustive lookup docs, updated in the same PR as the change they describe.
- `brief/` — client material. Never edit; add a dated note at the top if something is superseded.
- Changes are recorded in the root `CHANGELOG.md`.
