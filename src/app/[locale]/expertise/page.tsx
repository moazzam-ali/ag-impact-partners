import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteHeader } from "@/components/layout/site-header";
import { ExpertiseFields } from "@/components/sections/expertise/expertise-fields";
import { type Locale } from "@/i18n/routing";

type Params = Promise<{ locale: Locale }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "expertise" });
  return { title: t("metaTitle") };
}

export default async function ExpertisePage({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <SiteHeader />
      <main id="main">
        <ExpertiseFields />
      </main>
    </>
  );
}
