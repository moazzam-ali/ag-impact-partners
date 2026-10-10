"use client";

import { useTranslations } from "next-intl";

import { SignatureShell } from "../signature-shell";
import { DRAW_DURATION } from "./hello-renderer";
import { HelloSignature, PEN_DOWN } from "./hello-signature";

/*
  Hero variant "hello": the Apple-hello idea applied to the client's name. A round monoline "ag
  impact" writes itself at an even pen speed; the second headline line rises as the pen lifts;
  then the signature becomes a plucked string.
*/
export function HeroSigHello() {
  const t = useTranslations("heroSignature");
  return (
    <SignatureShell
      hint={t("hint.hello")}
      hintAt={PEN_DOWN + DRAW_DURATION + 0.6}
      titleTimings={{ first: 0.35, second: PEN_DOWN + DRAW_DURATION - 0.45 }}
      titleSize="large"
      theme="dark"
    >
      <HelloSignature />
    </SignatureShell>
  );
}
