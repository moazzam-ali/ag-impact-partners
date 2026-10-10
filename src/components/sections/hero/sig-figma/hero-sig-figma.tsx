"use client";

import { SignatureShell } from "../signature-shell";
import styles from "./hero-sig-figma.module.css";
import { FigmaSignature } from "./figma-signature";

/*
  Hero variant "figma": the Figma frame 1:155 as designed, refined. Light paper, the headline at the
  Figma's medium sizes, and one peach pen line that leaves title 1's full stop, writes "ag impact
  partners" and lands on title 2's first letter. Both lines rise first; the pen starts while they are
  still moving (the shell's default timings). No interaction in this round.
*/
export function HeroSigFigma() {
  return (
    <SignatureShell theme="light" titleSize="medium" className={styles.hero}>
      <FigmaSignature />
    </SignatureShell>
  );
}
