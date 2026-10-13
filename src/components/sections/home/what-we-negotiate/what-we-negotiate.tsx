import { getTranslations } from "next-intl/server";

import styles from "./what-we-negotiate.module.css";
import { WhatWeNegotiateStage } from "./what-we-negotiate-stage";

/*
  A2 · Ce que nous négocions. The hero's sentence carries on: four things the firm negotiates, one
  at a time and very large, then who it is for (the statement) and the client types as a quiet
  running line at the bottom. The section is taller than the screen and its stage sticks for the
  run, so scrolling steps through the four (the motion is in use-what-we-negotiate.ts). Without
  motion or script it is a still page: the four stacked as a list.
*/

/** Names the section from its heading inside the stage. */
const LABEL_ID = "what-we-negotiate-label";

const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

export async function WhatWeNegotiate() {
  const t = await getTranslations("whatWeNegotiate");

  return (
    <section className={styles.section} aria-labelledby={LABEL_ID} data-section="a2" data-sequence>
      <WhatWeNegotiateStage
        labelId={LABEL_ID}
        label={t("label")}
        items={strings(t.raw("items"))}
        statement={t("statement")}
        clientsLabel={t("clientsLabel")}
        clients={strings(t.raw("clients"))}
      />
    </section>
  );
}
