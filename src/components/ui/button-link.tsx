import { type ComponentProps, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

import styles from "./button-link.module.css";

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
  variant?: "primary" | "ghost";
};

/** The site's one button: a locale-aware link styled as a pill with a text-roll hover. */
export function ButtonLink({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={cn(styles.btn, variant === "ghost" && styles.ghost, className)} {...props}>
      <span className={styles.roll}>
        <span className={styles.main}>{children}</span>
        <span className={styles.clone} aria-hidden="true">
          {children}
        </span>
      </span>
    </Link>
  );
}
