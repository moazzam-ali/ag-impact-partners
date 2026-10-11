import { type Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { SiteHeader } from "@/components/layout/site-header";
import { HeroEditorial } from "@/components/sections/hero/editorial/hero-editorial";
import { NextPlaceholder } from "@/components/sections/home/next-placeholder";
import { type Locale } from "@/i18n/routing";

// Review page for one hero variant in isolation (a broken variant cannot break the others).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LabPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <HeroEditorial />
        <NextPlaceholder />
      </main>
    </>
  );
}
