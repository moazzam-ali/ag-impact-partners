import achats from "@/assets/hero/field-achats.jpg";
import contenus from "@/assets/hero/field-contenus.jpg";
import distribution from "@/assets/hero/field-distribution.jpg";
import media from "@/assets/hero/field-media.jpg";
import telecom from "@/assets/hero/field-telecom.jpg";
import paris from "@/assets/hero/paris.jpg";
import signature from "@/assets/hero/signature.jpg";
import table from "@/assets/hero/table.jpg";

/*
  Imagery for the image-led hero studies (round 5). Generated for this project in one art direction
  (low-key, charcoal shadows, a single peach-amber light, no faces, no logos); not stock, but still
  to be approved by the client before any real use, or replaced by a commissioned shoot.

  FIELD_IMAGES follows the five fields in the brief's fixed order: 01 Télécom, 02 Média,
  03 Distribution, 04 Contenus, 05 Optimisation des contrats d'achat.
*/
export const FIELD_IMAGES = [telecom, media, distribution, contenus, achats] as const;

/** An empty boardroom over the roofs; a hand signing; the roofs at blue hour. */
export const SCENES = { table, signature, paris } as const;
