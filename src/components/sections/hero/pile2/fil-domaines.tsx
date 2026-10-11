"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";
import { useFieldsLine } from "@/lib/animations/use-fields-line";

import { type Field } from "./documents";
import styles from "./fil-domaines.module.css";
import { FieldIcon } from "./icons";

/*
  "Le fil des domaines": a slim running line of the five fields, each a small card with its line
  icon (one moving part in ink) and its name. No visible label (it names the list for screen
  readers): the line runs edge to edge, drawn in from the left on load, faster with the scroll
  (backwards when scrolling up), almost still under the pointer.
*/

/** A field's icon at the size and colours of the thread; also used beside the callout's title. */
export function FieldMark({ index, className }: { index: number; className?: string }) {
  return (
    <span className={cn(styles.icon, className)}>
      <FieldIcon index={index} />
    </span>
  );
}

type Props = { fields: Field[]; label: string; className?: string };

export function FilDomaines({ fields, label, className }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useFieldsLine(root);

  const items = (copy: number) =>
    fields.map((field, i) => (
      <li key={`${copy}-${field.n}`} className={styles.item}>
        <FieldMark index={i} />
        <span className={styles.title}>{field.title}</span>
      </li>
    ));

  return (
    <div ref={root} className={cn(styles.fil, className)} data-fil>
      <div className={styles.window} data-window>
        <div className={styles.track} data-track>
          {/* Three runs: the window can be wider than one, and the loop needs one more beyond it. */}
          {[0, 1, 2].map((copy) => (
            <ul
              key={copy}
              className={styles.run}
              data-run={copy === 0 ? "" : undefined}
              aria-label={copy === 0 ? label : undefined}
              aria-hidden={copy > 0 || undefined}
            >
              {items(copy)}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
