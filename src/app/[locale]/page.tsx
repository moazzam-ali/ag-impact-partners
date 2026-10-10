import { setRequestLocale } from "next-intl/server";

import { SiteHeader } from "@/components/layout/site-header";
import { HomeHero } from "@/components/sections/hero/home-hero";
import { NextPlaceholder } from "@/components/sections/home/next-placeholder";
import { type Locale } from "@/i18n/routing";

// The layout has already validated the locale, so it is typed as Locale here.
export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <HomeHero />
        <NextPlaceholder />
      </main>
    </>
  );
}
