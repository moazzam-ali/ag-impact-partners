"use client";

import { useTranslations } from "next-intl";

import { SignatureShell } from "../signature-shell";
import { SCEAU_SEAL_AT, SceauSignature } from "./sceau-signature";

/*
  Hero variant "sceau": "AG Impact" is signed in ink, then sealed: the ink sinks into the paper and
  leaves a blind emboss that catches a raking light. The visitor moves the light with the pointer.
  The only light variant of the set.
*/
export function HeroSigSceau() {
  const t = useTranslations("heroSignature");
  return (
    <SignatureShell
      hint={t("hint.sceau")}
      hintAt={SCEAU_SEAL_AT + 2.2}
      titleTimings={{ first: 0.35, second: SCEAU_SEAL_AT + 0.45 }}
      titleSize="large"
      theme="light"
    >
      <SceauSignature />
    </SignatureShell>
  );
}
