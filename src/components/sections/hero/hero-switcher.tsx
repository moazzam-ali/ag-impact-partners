"use client";

import { useTranslations } from "next-intl";
import { Fragment, useEffect } from "react";

import styles from "./hero-switcher.module.css";
import { HERO_ROUND_STARTS, HERO_VARIANTS, type HeroVariant } from "./variants";

/*
  Review tool: a floating bar to compare hero variants, split by round; keys 1–9 and 0 switch to the
  first ten. It wraps on narrow screens. Turn it off in
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
      if (!/^\d$/.test(e.key)) return;
      const next = HERO_VARIANTS[e.key === "0" ? 9 : Number(e.key) - 1];
      if (next) onChange(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChange]);

  return (
    <nav aria-label={t("label")} className={styles.switch}>
      {HERO_VARIANTS.map((variant, i) => (
        <Fragment key={variant}>
          {HERO_ROUND_STARTS.includes(variant) ? (
            <span className={styles.divider} aria-hidden="true" />
          ) : null}
          <button
            type="button"
            aria-pressed={variant === value}
            onClick={() => onChange(variant)}
            className={styles.button}
          >
            {t(variant)}
            {i < 10 ? <kbd className={styles.key}>{(i + 1) % 10}</kbd> : null}
          </button>
        </Fragment>
      ))}
    </nav>
  );
}
