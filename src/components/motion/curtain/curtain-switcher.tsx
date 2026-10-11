"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";

import styles from "./curtain-switcher.module.css";
import { chooseCurtain, CURTAIN_STYLES, type CurtainStyle } from "./styles";

/** Review only: picks the splash and page-transition style; choosing (or replaying) reloads. */
export function CurtainSwitcher({ value }: { value: CurtainStyle }) {
  const t = useTranslations("curtainSwitcher");

  return (
    <div className={styles.switcher} role="group" aria-label={t("label")}>
      <span className={styles.label}>{t("label")}</span>
      {CURTAIN_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          className={cn(styles.option, style === value && styles.active)}
          aria-pressed={style === value}
          onClick={() => chooseCurtain(style)}
        >
          {t(style)}
        </button>
      ))}
      <button
        type="button"
        className={styles.replay}
        aria-label={t("replay")}
        title={t("replay")}
        onClick={() => chooseCurtain(value)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
        </svg>
      </button>
    </div>
  );
}
