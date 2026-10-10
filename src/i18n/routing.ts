import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // French lives at "/", English at "/en". Add `pathnames` here if localised slugs are wanted later.
  localePrefix: "as-needed",
  // The site is French first: "/" is always French, English is an explicit choice via /en or the
  // switch. No redirect based on the browser's Accept-Language.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
