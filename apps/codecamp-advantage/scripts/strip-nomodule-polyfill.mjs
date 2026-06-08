#!/usr/bin/env node
/**
 * Strips Next.js's nomodule polyfill from the build manifest.
 *
 * Next.js always emits a `<script src="...noModule">` polyfill in <head>
 * regardless of browserslist, but the codecamp Phase 6 probe
 * (`countRenderBlockingScripts` in
 * `lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`) counts
 * any synchronous external <script src=...> in <head> as render-blocking.
 *
 * We don't need the polyfill: codecamp targets only modern browsers that
 * natively support ES modules (see `.browserslistrc`). For those browsers,
 * the polyfill is a no-op anyway (the `noModule` attribute tells the browser
 * to skip it). The polyfill's only effect is to add a parse cost and — per
 * the probe — a render-blocking tag.
 *
 * This script empties `polyfillFiles` in every `build-manifest.json` written
 * by the Turbopack/webpack build. At render time, Next.js maps that array to
 * `<script src="..." noModule>` tags in <head>; with it empty, no such tag
 * is emitted and the probe goes to 0.
 *
 * The script is idempotent: a second run is a no-op.
 *
 * Track: codecamp_asset_render_blocking_20260608
 * Idempotent: yes.
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST_DIR = process.argv[2] || ".next";

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === "ENOENT") return;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "cache") continue;
      yield* walk(full);
    } else if (entry.isFile() && entry.name === "build-manifest.json") {
      yield full;
    }
  }
}

async function patchManifest(file) {
  const raw = await readFile(file, "utf8");
  const manifest = JSON.parse(raw);
  if (!Array.isArray(manifest.polyfillFiles) || manifest.polyfillFiles.length === 0) {
    return { changed: false, removed: [] };
  }
  const removed = manifest.polyfillFiles.slice();
  manifest.polyfillFiles = [];
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { changed: true, removed };
}

async function main() {
  const root = join(process.cwd(), DIST_DIR);
  try {
    await stat(root);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      console.error(`[strip-nomodule-polyfill] ${DIST_DIR}/ not found — nothing to do`);
      return;
    }
    throw err;
  }

  let patched = 0;
  let scanned = 0;
  const removedFiles = new Set();
  for await (const file of walk(root)) {
    scanned++;
    const { changed, removed } = await patchManifest(file);
    if (changed) {
      patched++;
      for (const rel of removed) removedFiles.add(rel);
    }
  }

  if (patched === 0) {
    console.log(
      `[strip-nomodule-polyfill] scanned ${scanned} build-manifest.json files in ${DIST_DIR}/ — no changes needed`,
    );
    return;
  }

  console.log(
    `[strip-nomodule-polyfill] patched ${patched} of ${scanned} build-manifest.json files in ${DIST_DIR}/ — removed polyfills: ${[...removedFiles].join(", ")}`,
  );
}

main().catch((err) => {
  console.error("[strip-nomodule-polyfill] failed:", err);
  process.exit(1);
});
