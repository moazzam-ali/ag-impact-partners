# Environment variables

| Variable               | Purpose                                                                                 | Scope                   | Where                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Absolute site URL for `metadataBase` (canonical and OpenGraph URLs). No trailing slash. | Build + runtime, public | Vercel project env (Production: the live domain; Preview: leave unset or the preview domain). Locally in `.env.local`. |

Defaults to `http://localhost:3000` when unset (see `src/config/site.ts`).

`.env*` files are gitignored; `.env.example` documents the keys.
