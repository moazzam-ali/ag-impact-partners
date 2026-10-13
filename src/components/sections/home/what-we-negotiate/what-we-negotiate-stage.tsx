"use client";

import { useRef } from "react";

import { Words } from "@/components/motion/words";
import { useWhatWeNegotiate } from "@/lib/animations/use-what-we-negotiate";

import styles from "./what-we-negotiate.module.css";

/*
  The stage of A2, one screen: the label hangs at the left like the start of a sentence, the
  phrase it leads into fills the rest of the width, a hairline under it counts the four steps, the
  statement steps down to the right, and the client types run along the foot of the screen. All
  four phrases are in the list at once (screen readers read all four); the motion shows one.
*/

type Props = {
  labelId: string;
  label: string;
  items: string[];
  statement: string;
  clientsLabel: string;
  clients: string[];
};

export function WhatWeNegotiateStage({
  labelId,
  label,
  items,
  statement,
  clientsLabel,
  clients,
}: Props) {
  const root = useRef<HTMLDivElement>(null);

  useWhatWeNegotiate(root);

  return (
    <div ref={root} className={styles.stage} data-state="pending">
      <div className={styles.frame}>
        <h2 id={labelId} className={styles.label} data-label>
          <Words text={label} />
        </h2>

        <ol className={styles.items}>
          {items.map((item) => (
            <li key={item} className={styles.item} data-item>
              <Words text={item} />
            </li>
          ))}
        </ol>

        <div className={styles.progress} aria-hidden="true">
          <span className={styles.rule} data-rule />
          <span className={styles.track}>
            <span className={styles.fill} data-fill />
          </span>
          <span className={styles.marks} data-rise>
            {items.map((item, i) => (
              <span key={item} className={styles.mark} data-mark>
                {String(i + 1).padStart(2, "0")}
              </span>
            ))}
          </span>
        </div>

        <p className={styles.statement} data-statement>
          <Words text={statement} />
        </p>
      </div>

      <div className={styles.ticker} data-rise>
        <div className={styles.drift} data-drift>
          {/* Three copies: the line can be wider than one, and the loop needs one more past it. */}
          {[0, 1, 2].map((copy) => (
            <ul
              key={copy}
              className={styles.copy}
              data-copy={copy === 0 ? "" : undefined}
              aria-label={copy === 0 ? clientsLabel : undefined}
              aria-hidden={copy > 0 || undefined}
            >
              {clients.map((client) => (
                <li key={client} className={styles.client}>
                  {client}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
