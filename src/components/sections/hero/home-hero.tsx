"use client";

import { siteConfig } from "@/config/site";

import { HeroCables } from "./hero-cables";
import { useHeroVariant } from "./use-hero-variant";
import { type HeroVariant } from "./variants";

const VARIANTS: Record<HeroVariant, () => React.JSX.Element> = {
  cables: HeroCables,
};

/** The homepage hero: renders the active variant (see variants.ts). */
export function HomeHero() {
  const variant = useHeroVariant(siteConfig.heroVariant);
  const Hero = VARIANTS[variant];
  return <Hero key={variant} />;
}
