#!/usr/bin/env node
/**
 * Copies the 3D game assets into an app's `public/` folder (packs, stories, the 2D sprite pack,
 * and the HUD fonts), so the app serves them at the URLs the games expect:
 *
 *   /packs/<pack>/<version>/...          3D model packs
 *   /stories/...                         story JSON and images
 *   /assets/apk/primary-chibi-2d/v1/...  2D sprite pack (Phaser)
 *   /assets/apk3d/fonts/...              HUD fonts
 *
 * Usage: node scripts/sync-assets.mjs <public-dir>   (the target folders are replaced).
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "..", "assets");
const fonts = join(here, "..", "..", "advantage-play-kit-3d", "assets", "fonts");
const target = resolve(process.argv[2] ?? "");
if (!process.argv[2]) {
  console.error("usage: sync-assets.mjs <public-dir>");
  process.exit(1);
}

const copies = [
  [join(assets, "packs"), join(target, "packs")],
  [join(assets, "stories"), join(target, "stories")],
  [join(assets, "apk", "primary-chibi-2d"), join(target, "assets", "apk", "primary-chibi-2d")],
  [fonts, join(target, "assets", "apk3d", "fonts")],
];
for (const [from, to] of copies) {
  if (!existsSync(from)) throw new Error(`missing ${from}`);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}
console.log(`synced 3D game assets into ${target}`);
