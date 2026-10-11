import { setRequestLocale } from "next-intl/server";

import { SiteHeader } from "@/components/layout/site-header";
import { HeroPile2 } from "@/components/sections/hero/pile2/hero-pile2";
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
        <HeroPile2 />
        <NextPlaceholder />
      </main>
    </>
  );
}
