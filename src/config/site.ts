import { type HeroVariant } from "@/components/sections/hero/variants";

/*
  Site-wide configuration. Copy lives in messages/*.json, colours in src/styles/tokens.css; this is
  for structure and switches. Client decisions that are still open are modelled as switches here so
  flipping them is a one-line change (see docs/brief/site-structure.md, "What we still need").
*/
export const siteConfig = {
  name: "AG Impact Partners",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  nav: [
    { key: "expertise", href: "/expertise" },
    { key: "references", href: "/references" },
    { key: "contact", href: "/contact" },
  ],

  // Both to be confirmed by the client before launch. Paris only: no street address on the site.
  contact: {
    email: null as string | null,
    phone: null as string | null,
    city: "Paris",
  },

  features: {
    /** The brief launches French-only; keep the switch in the header until then and hide it at launch. */
    localeSwitch: true,
    themeToggle: true,
  },

  /** Active hero variant (src/components/sections/hero/variants.ts). Override for review with ?hero=. */
  heroVariant: "cables" satisfies HeroVariant,
} as const;

export type NavKey = (typeof siteConfig.nav)[number]["key"];
