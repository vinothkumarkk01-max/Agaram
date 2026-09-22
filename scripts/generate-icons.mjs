// Generates Agaramiya's PWA / favicon icon set from the official brand
// mark — public/brand/agaramiya-mark-source.png, a square, pre-padded
// crop of the monogram from the brand logo artwork the founder
// supplied (Sept 2026). That source already centers the monogram at
// roughly 66% of the canvas on the artwork's own cream background
// (#FEF7EA), which is what "standard" icons below use as-is; the
// "safe-zone" variants (maskable / Apple) extend the canvas with more
// of that same cream so the monogram shrinks to a smaller, centered
// fraction before an OS crops its own corner/circle mask over it.
//
// Re-run with `npm run icons:generate` any time the brand mark image
// changes — re-crop a new square master into
// public/brand/agaramiya-mark-source.png first (see the crop notes in
// README's branding section), then re-run this script.
//
// Output:
//   public/apple-touch-icon.png        180x180, full-bleed (Apple masks its own corners)
//   public/icons/icon-192.png          192x192, "any" purpose
//   public/icons/icon-512.png          512x512, "any" purpose
//   public/icons/icon-maskable-192.png 192x192, "maskable" purpose (safe-zone padded)
//   public/icons/icon-maskable-512.png 512x512, "maskable" purpose (safe-zone padded)
//   src/app/icon.png                   512x512 — Next.js favicon file convention
//   src/app/apple-icon.png             180x180 — Next.js apple-touch-icon file convention
//   src/app/favicon.ico                16/32/48 multi-res — Next.js favicon.ico convention

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const ROOT = path.resolve(import.meta.dirname, "..");
const MARK_SOURCE = path.join(ROOT, "public", "brand", "agaramiya-mark-source.png");

// The source's own background — sampled directly from the brand
// artwork (not the app's `--bg` token, which is a close but distinct
// warm ivory) — used to extend its canvas without introducing a seam.
const MARK_BG = { r: 254, g: 247, b: 234, alpha: 1 };
const MARK_FILL = 0.66; // fraction of the source canvas the monogram itself occupies

/**
 * Loads the square brand-mark source and, for a `targetFill` smaller
 * than the source's own MARK_FILL, extends its canvas with more of the
 * same background so the monogram ends up occupying that smaller
 * fraction once resized down to `size` — the "safe zone" maskable /
 * Apple icons need so an OS's own corner/circle crop never clips it.
 */
async function buildIcon(size, targetFill = MARK_FILL) {
  const base = sharp(MARK_SOURCE);
  const { width: sourceSize } = await base.metadata();

  let pipeline = base;
  if (targetFill < MARK_FILL) {
    const newCanvasSize = Math.round(sourceSize * (MARK_FILL / targetFill));
    const border = Math.round((newCanvasSize - sourceSize) / 2);
    pipeline = pipeline.extend({
      top: border,
      bottom: border,
      left: border,
      right: border,
      background: MARK_BG,
    });
  }

  return pipeline.resize(size, size).png().toBuffer();
}

async function main() {
  await mkdir(path.join(ROOT, "public", "icons"), { recursive: true });

  const SAFE_ZONE_FILL = 0.4; // Android/Apple guidance: stay inside an ~80%-diameter safe circle

  const [icon192, icon512, maskable192, maskable512, appleTouch] = await Promise.all([
    buildIcon(192),
    buildIcon(512),
    buildIcon(192, SAFE_ZONE_FILL),
    buildIcon(512, SAFE_ZONE_FILL),
    buildIcon(180, SAFE_ZONE_FILL),
  ]);

  await Promise.all([
    writeFile(path.join(ROOT, "public", "icons", "icon-192.png"), icon192),
    writeFile(path.join(ROOT, "public", "icons", "icon-512.png"), icon512),
    writeFile(path.join(ROOT, "public", "icons", "icon-maskable-192.png"), maskable192),
    writeFile(path.join(ROOT, "public", "icons", "icon-maskable-512.png"), maskable512),
    writeFile(path.join(ROOT, "public", "apple-touch-icon.png"), appleTouch),
    // Next.js file-convention icons — dropping these in src/app means
    // Next automatically emits the right <link> tags with no manual
    // metadata wiring.
    writeFile(path.join(ROOT, "src", "app", "icon.png"), icon512),
    writeFile(path.join(ROOT, "src", "app", "apple-icon.png"), appleTouch),
  ]);

  // Multi-resolution favicon.ico (16/32/48) for browser tabs/bookmarks
  // — the standard (non-safe-zone) fill, since nothing masks a favicon.
  const [ico16, ico32, ico48] = await Promise.all([
    buildIcon(16),
    buildIcon(32),
    buildIcon(48),
  ]);
  const icoBuffer = await pngToIco([ico16, ico32, ico48]);
  await writeFile(path.join(ROOT, "src", "app", "favicon.ico"), icoBuffer);

  console.log("Generated Agaramiya icon set from public/brand/agaramiya-mark-source.png:");
  console.log("  public/icons/icon-192.png, icon-512.png");
  console.log("  public/icons/icon-maskable-192.png, icon-maskable-512.png");
  console.log("  public/apple-touch-icon.png");
  console.log("  src/app/icon.png, src/app/apple-icon.png, src/app/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
