import { type Metadata } from "next";
import { Instrument_Sans, Ms_Madi } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type ReactNode } from "react";

import { Providers } from "@/components/providers";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";

import "@/styles/globals.css";

// The Figma's face for everything: nav, buttons, both headline lines.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

// The Figma uses "Maddison Signature" (a demo-licensed font). Ms Madi is the closest Google face;
// swap it for the licensed file via next/font/local once the client buys it.
const msMadi = Ms_Madi({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-ms-madi",
  display: "swap",
});

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: t("title"),
    description: t("description"),
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Params;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${msMadi.variable}`}
    >
      <body className="min-h-svh bg-bg font-sans text-ink">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
