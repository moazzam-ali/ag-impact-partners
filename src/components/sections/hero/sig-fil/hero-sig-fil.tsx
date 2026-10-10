"use client";

import { useTranslations } from "next-intl";

import { SignatureShell } from "../signature-shell";
import { FilThread, GATHER_END } from "./fil-thread";

/*
  Hero variant "fil": "AG Impact" written as one continuous thread. Two hairlines meet in the
  centre, the joined line gathers itself into the signature, and the visitor can pull the thread.
  The second headline line rises as the signature settles.
*/
export function HeroSigFil() {
  const t = useTranslations("heroSignature");
  return (
    <SignatureShell
      hint={t("hint.fil")}
      hintAt={GATHER_END + 0.6}
      titleTimings={{ first: 0.35, second: GATHER_END - 0.5 }}
      titleSize="large"
      theme="dark"
    >
      <FilThread />
    </SignatureShell>
  );
}
