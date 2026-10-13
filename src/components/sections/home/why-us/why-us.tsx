import { getTranslations } from "next-intl/server";

import { Words } from "@/components/motion/words";

import styles from "./why-us.module.css";
import { WhyUsRun } from "./why-us-run";

const LABEL_ID = "why-us-label";

/*
  A3 · Ce qui nous distingue. One horizontal line, the table, splits the screen. The headline stands
  on it. Everything else hangs from it: the pull line under the headline, and at the hinge, where a
  knot sits on the line, the label and the body. As you scroll, the table tips, the headline turns
  over its edge and comes back up from the other side, and the pull line swings out from
  underneath (src/lib/animations/use-why-us.ts). Without motion it is that last frame, still.
*/
export async function WhyUs() {
  const t = await getTranslations("whyUs");

  return (
    <section className={styles.section} aria-labelledby={LABEL_ID} data-section="a3">
      <WhyUsRun className={styles.run}>
        <div className={styles.stage}>
          <div className={styles.table} data-table>
            <span className={styles.line} data-line aria-hidden="true" />
            <span className={styles.knot} data-knot aria-hidden="true" />
            <div className={styles.frame}>
              <div className={styles.head}>
                <p id={LABEL_ID} className={styles.label} data-label>
                  {t("label")}
                </p>
                <div className={styles.above}>
                  <h2 className={styles.title}>
                    <span className={styles.face} data-face>
                      <Words text={t("title")} />
                    </span>
                  </h2>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.frame}>
            <div className={styles.below} data-below>
              <p className={styles.body} data-body>
                <Words text={t("body")} />
              </p>
              <div className={styles.under}>
                <p className={styles.pull} data-pull>
                  {t("pull")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </WhyUsRun>
    </section>
  );
}
