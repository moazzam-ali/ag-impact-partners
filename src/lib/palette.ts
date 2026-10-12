/*
  The colour palette under review, on <html data-palette>, beside next-themes' data-theme (light /
  dark), so every palette has both modes:

  - orange: the dark, grey and orange palette the site was built in (the Figma, the Noir direction).
  - navy: AG Impact's theme from their proposal document (navy, deep navy, one blue accent, ice),
    which the client leans towards.

  Read order: ?palette= in the URL (stored), then localStorage, then the default. PALETTE_SCRIPT
  sets it in <head> before the first paint; choosing one swaps it live (no reload). Tokens live in
  src/styles/tokens.css. No React here: the server layout imports the script.
*/
export const PALETTES = ["orange", "navy"] as const;
export type Palette = (typeof PALETTES)[number];
export const DEFAULT_PALETTE: Palette = "orange";

const STORAGE_KEY = "agi:palette";

export const isPalette = (value: unknown): value is Palette =>
  typeof value === "string" && (PALETTES as readonly string[]).includes(value);

/** Inline in <head>: the same read as readPalette(), before anything is painted. */
export const PALETTE_SCRIPT = `(function(){var d=${JSON.stringify(DEFAULT_PALETTE)},l=${JSON.stringify(PALETTES)},p=d;try{var u=new URLSearchParams(location.search).get("palette"),s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(l.indexOf(u)>-1){p=u;localStorage.setItem(${JSON.stringify(STORAGE_KEY)},u)}else if(l.indexOf(s)>-1)p=s}catch(e){}document.documentElement.setAttribute("data-palette",p)})()`;

function readPalette(): Palette {
  const fromUrl = new URLSearchParams(window.location.search).get("palette");
  if (isPalette(fromUrl)) return fromUrl;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPalette(stored)) return stored;
  } catch {
    // Storage can be unavailable; the URL and the default still work.
  }
  return DEFAULT_PALETTE;
}

/** The palette on the page now. */
export const currentPalette = (): Palette => {
  const value = document.documentElement.dataset.palette;
  return isPalette(value) ? value : DEFAULT_PALETTE;
};

/**
 * Puts the stored palette back on <html>. React's dev remount resets <html> to its JSX attributes,
 * which drops the one PALETTE_SCRIPT set; a no-op in production.
 */
export function syncPalette() {
  const palette = readPalette();
  if (document.documentElement.dataset.palette !== palette) {
    document.documentElement.dataset.palette = palette;
  }
}

/** Swaps the palette live and stores it. Transitions are held for the swap, as next-themes does. */
export function choosePalette(palette: Palette) {
  try {
    window.localStorage.setItem(STORAGE_KEY, palette);
  } catch {
    // Without storage the choice lasts until the next load.
  }
  const url = new URL(window.location.href);
  if (url.searchParams.has("palette")) {
    url.searchParams.delete("palette");
    window.history.replaceState(window.history.state, "", url);
  }
  const hold = document.createElement("style");
  hold.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(hold);
  document.documentElement.dataset.palette = palette;
  void window.getComputedStyle(document.body).opacity;
  window.setTimeout(() => hold.remove(), 1);
}

/** Calls `fn` whenever the palette on <html> changes. */
export function onPaletteChange(fn: () => void) {
  const observer = new MutationObserver(fn);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-palette"],
  });
  return () => observer.disconnect();
}
