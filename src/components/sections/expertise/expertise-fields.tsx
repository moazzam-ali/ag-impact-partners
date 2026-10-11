"use client";

import { useMessages, useTranslations } from "next-intl";
import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { FieldMark } from "@/components/sections/hero/pile2/fil-domaines";
import { ButtonLink } from "@/components/ui/button-link";
import { useExpertise } from "@/lib/animations/use-expertise";

import styles from "./expertise-fields.module.css";

/*
  A simple Expertise page, enough to show page transitions: the brief's line on the five fields
  as the heading, then the fields in their fixed order with their lines from the brief. Its motion
  is in src/lib/animations/use-expertise.ts.
*/
export function ExpertiseFields() {
  const t = useTranslations();
  const messages = useMessages();
  const [heading = "", ...rest] = messages.expertise.intro.split(/(?<=\.)\s+/);
  const lede = rest.join(" ");
  const root = useRef<HTMLElement>(null);

  useExpertise(root);

  return (
    <section ref={root} className={styles.page} data-state="pending">
      <header className={styles.head}>
        <p className={styles.eyebrow} data-in>
          {t("nav.expertise")}
        </p>
        <h1 className={styles.title} data-title>
          <Words text={heading} />
        </h1>
        <div className={styles.side} data-in>
          <p className={styles.lede}>{lede}</p>
          <ButtonLink href="/contact">{t("hero.primary")}</ButtonLink>
        </div>
      </header>

      <ol className={styles.fields}>
        {messages.pile.fields.map((field, i) => (
          <li key={field.n} className={styles.field}>
            <span className={styles.rule} data-rule />
            <div className={styles.row} data-row>
              <FieldMark index={i} className={styles.mark} />
              <h2 className={styles.name}>{field.title}</h2>
              <p className={styles.body}>{field.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
