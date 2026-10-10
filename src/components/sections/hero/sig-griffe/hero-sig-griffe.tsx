"use client";

import { useTranslations } from "next-intl";

import { SignatureShell } from "../signature-shell";
import { GriffeSignature } from "./griffe-signature";

/* Hero variant "griffe": the executive autograph, signed by scroll. */
export function HeroSigGriffe() {
  const t = useTranslations("heroSignature");
  return (
    <SignatureShell hint={t("hint.griffe")} hintAt={1.5} titleSize="large" theme="dark">
      <GriffeSignature />
    </SignatureShell>
  );
}
