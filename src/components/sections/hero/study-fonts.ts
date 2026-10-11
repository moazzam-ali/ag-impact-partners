import { Archivo, Geist_Mono, Newsreader } from "next/font/google";

/*
  Faces used only by the hero studies (redline, accord, rapport), loaded with the variant that uses
  them rather than site-wide. Keep the ones the chosen direction needs, drop the rest.
*/

/** Redline: the contract and the headline it gives up. Optical size axis for 16px body vs 120px display. */
export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

/** Clause numbers, readouts, small labels. */
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

/** Rapport: width axis 62–125, so letters can be squeezed and stretched. */
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
