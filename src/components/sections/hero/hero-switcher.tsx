"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import styles from "./hero-switcher.module.css";
import { HERO_VARIANTS, type HeroVariant } from "./variants";

/*
  Review tool: a floating pill to compare hero variants; keys 1–9 also switch. Turn it off in
  siteConfig.features once a variant is chosen.
*/
export function HeroSwitcher({
  value,
  onChange,
}: {
  value: HeroVariant;
  onChange: (next: HeroVariant) => void;
}) {
  const t = useTranslations("heroSwitcher");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      const next = HERO_VARIANTS[Number(e.key) - 1];
      if (next) onChange(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <nav aria-label={t("label")} className={styles.switch}>
      {HERO_VARIANTS.map((variant, i) => (
        <button
          key={variant}
          type="button"
          aria-pressed={variant === value}
          onClick={() => onChange(variant)}
          className={styles.button}
        >
          {t(variant)}
          <kbd className={styles.key}>{i + 1}</kbd>
        </button>
      ))}
    </nav>
  );
}
