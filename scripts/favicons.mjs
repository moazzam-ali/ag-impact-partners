/*
  Builds the favicons from the mark (public/brand/mark-charcoal.svg). Run after the logo changes:
  `npm run favicons`. Uses sharp, which Next installs for image optimisation.

  - src/app/icon.svg: the mark alone, charcoal on light browser chrome and paper on dark.
  - src/app/favicon.ico: 16, 32 and 48px, the mark on a rounded black tile (legible on any tab).
  - src/app/apple-icon.png: 180px, full-bleed black (iOS rounds the corners itself).
  - public/icons/icon-192.png, icon-512.png: the rounded tile, for the web manifest.
  - public/icons/icon-maskable-512.png: full-bleed, the mark inside the maskable safe zone.
*/
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(join(root, "public/brand/mark-charcoal.svg"), "utf8");
const d = source.match(/\sd="([^"]+)"/)?.[1];
if (!d) throw new Error("No path in the mark SVG");

// The mark's box in its own units (the SVG's viewBox).
const MARK = { x: 59, y: 78, w: 1216, h: 894 };
const INK = "#000000";
const PAPER = "#f4f1ec";
const CHARCOAL = "#191a23";

/** An SVG of `size` units with the mark `width` wide, centred, on an optional tile. */
function art({ size, width, tile, radius = 0, fill, style = "" }) {
  const k = width / MARK.w;
  const x = (size - width) / 2 - MARK.x * k;
  const y = (size - MARK.h * k) / 2 - MARK.y * k;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    style,
    tile ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${tile}"/>` : "",
    `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)})"${fill ? ` fill="${fill}"` : ""} d="${d}"/>`,
    "</svg>",
  ].join("");
}

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

/** An .ico holding PNG images (supported everywhere since Windows Vista). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt8(0, at + 2);
    header.writeUInt8(0, at + 3);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

// The tab icon: transparent, its colour following the browser's light or dark chrome.
const adaptive = art({
  size: 1300,
  width: 1216,
  style: `<style>path{fill:${CHARCOAL}}@media (prefers-color-scheme:dark){path{fill:${PAPER}}}</style>`,
});
// The tile: a rounded black square, the mark in paper at 74% of its width.
const tile = art({ size: 512, width: 380, tile: INK, radius: 112, fill: PAPER });
// Full bleed for iOS and maskable icons (the mark within the central safe zone).
const bleed = art({ size: 512, width: 330, tile: INK, fill: PAPER });
const safe = art({ size: 512, width: 270, tile: INK, fill: PAPER });

await mkdir(join(root, "public/icons"), { recursive: true });
await writeFile(join(root, "src/app/icon.svg"), `${adaptive}\n`);
await writeFile(
  join(root, "src/app/favicon.ico"),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(tile, size) })))),
);
await writeFile(join(root, "src/app/apple-icon.png"), await png(bleed, 180));
await writeFile(join(root, "public/icons/icon-192.png"), await png(tile, 192));
await writeFile(join(root, "public/icons/icon-512.png"), await png(tile, 512));
await writeFile(join(root, "public/icons/icon-maskable-512.png"), await png(safe, 512));
console.warn("Favicons written: src/app/{icon.svg,favicon.ico,apple-icon.png}, public/icons/*");
