"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { PeakMark } from "@/components/brand/peak-mark";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";

import styles from "./site-header.module.css";

/*
  Figma header: logo circle, nav pill, CTA on the right, measured in stage pixels so it stays aligned
  with the hero. Hides on scroll down and returns on scroll up (brief, G1).
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
        {siteConfig.features.themeToggle ? <ThemeToggle /> : null}
      </div>

      <Link href="/contact" className={styles.cta}>
        {t("cta")}
      </Link>
    </header>
  );
}
