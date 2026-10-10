"use client";

import dynamic from "next/dynamic";
import { type ComponentType } from "react";

import { siteConfig } from "@/config/site";

import { HeroSwitcher } from "./hero-switcher";
import { useHeroVariant } from "./use-hero-variant";
import { type HeroVariant } from "./variants";

// Loaded on demand, so only the active variant's code (and shader / canvas work) ships.
const VARIANTS: Record<HeroVariant, ComponentType> = {
  cables: dynamic(() => import("./hero-cables").then((m) => m.HeroCables)),
  hello: dynamic(() => import("./sig-hello/hero-sig-hello").then((m) => m.HeroSigHello)),
  plume: dynamic(() => import("./sig-plume/hero-sig-plume").then((m) => m.HeroSigPlume)),
  griffe: dynamic(() => import("./sig-griffe/hero-sig-griffe").then((m) => m.HeroSigGriffe)),
  fil: dynamic(() => import("./sig-fil/hero-sig-fil").then((m) => m.HeroSigFil)),
  sceau: dynamic(() => import("./sig-sceau/hero-sig-sceau").then((m) => m.HeroSigSceau)),
  figma: dynamic(() => import("./sig-figma/hero-sig-figma").then((m) => m.HeroSigFigma)),
};

/** The homepage hero: renders the active variant (see variants.ts) and, in review, the switcher. */
export function HomeHero() {
  const [variant, setVariant] = useHeroVariant(siteConfig.heroVariant);
  const Hero = VARIANTS[variant];

  return (
    <>
      <Hero key={variant} />
      {siteConfig.features.heroVariantSwitcher ? (
        <HeroSwitcher value={variant} onChange={setVariant} />
      ) : null}
    </>
  );
}
