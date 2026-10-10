"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { PeakMark } from "@/components/brand/peak-mark";
import { ButtonLink } from "@/components/ui/button-link";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";

import styles from "./site-header.module.css";

/*
  Logo circle, nav pill, tools and the one CTA. Sized on the shared scale and gutter so it lines up
  with page content. Hides on scroll down and returns on scroll up (brief, G1).
*/
export function SiteHeader() {
  const t = useTranslations("nav");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lastY = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        el.dataset.hidden = y > lastY && y > 140 ? "true" : "false";
        lastY = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} className={styles.header} data-hidden="false">
      <Link href="/" className={styles.logo} aria-label={siteConfig.name}>
        <PeakMark className={styles.mark} />
      </Link>

      <nav className={styles.pill} aria-label={t("primary")}>
        {siteConfig.nav.map((item) => (
          <Link key={item.key} href={item.href} className={styles.link}>
            {t(item.key)}
          </Link>
        ))}
      </nav>

      <div className={styles.tools}>
        {siteConfig.features.localeSwitch ? <LocaleSwitch /> : null}
        {siteConfig.features.themeToggle ? <ThemeToggle className="max-md:hidden" /> : null}
      </div>

      <ButtonLink href="/contact">{t("cta")}</ButtonLink>
    </header>
  );
}
