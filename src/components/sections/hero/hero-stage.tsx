import { type ReactNode, type Ref } from "react";

import { cn } from "@/lib/cn";

import styles from "./hero.module.css";

type HeroStageProps = {
  ref?: Ref<HTMLElement>;
  title1: ReactNode;
  title2: ReactNode;
  /** The signature layer: an <svg> or <canvas> filling the stage. */
  art: ReactNode;
  children?: ReactNode;
  className?: string;
};

/*
  Shared skeleton for every hero variant: the scaled Figma stage, the two headline lines as one h1,
  and the art layer behind them. Starts in data-state="pending" (words masked, art hidden) until the
  variant's GSAP setup flips it to "ready".
*/
export function HeroStage({ ref, title1, title2, art, children, className }: HeroStageProps) {
  return (
    <section ref={ref} className={cn(styles.hero, className)} data-state="pending">
      <div className={styles.stage}>
        <div className={styles.art} aria-hidden="true">
          {art}
        </div>
        <h1 className={styles.headline}>
          <span className={styles.title1} data-title="1">
            {title1}
          </span>{" "}
          <span className={styles.title2} data-title="2">
            {title2}
          </span>
        </h1>
        {children}
      </div>
    </section>
  );
}
