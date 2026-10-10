"use client";

import { useTranslations } from "next-intl";

import { SignatureShell } from "../signature-shell";
import { PlumeSignature } from "./plume-signature";
import { PEN_END } from "./plume-timing";

/*
  Hero variant "plume": the pointed pen. "AG Impact" is written in formal copperplate, thick
  downstrokes and hairline upstrokes, in pen order, starting while the headline rises. Then the
  visitor can sign with the same nib.
*/
export function HeroSigPlume() {
  const t = useTranslations("heroSignature");
  return (
    <SignatureShell hint={t("hint.plume")} hintAt={PEN_END + 0.6} titleSize="large" theme="dark">
      <PlumeSignature />
    </SignatureShell>
  );
}
