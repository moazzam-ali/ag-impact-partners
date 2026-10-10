"use client";

import { useTranslations } from "next-intl";

import { SignatureShell } from "../signature-shell";
import { PlumeSignature } from "./plume-signature";
import { PEN_END, PEN_START } from "./plume-timing";

/*
  Hero variant "plume": the pointed pen. "AG Impact" is written in formal copperplate, thick
  downstrokes and hairline upstrokes, in pen order; line 2 of the headline rises as the pen leaves
  the paper. Then the visitor can sign with the same nib.
*/
export function HeroSigPlume() {
  const t = useTranslations("heroSignature");
  return (
    <SignatureShell
      hint={t("hint.plume")}
      hintAt={PEN_END + 0.6}
      titleTimings={{ first: Math.min(0.35, PEN_START), second: PEN_END - 0.55 }}
      titleSize="large"
      theme="dark"
    >
      <PlumeSignature />
    </SignatureShell>
  );
}
