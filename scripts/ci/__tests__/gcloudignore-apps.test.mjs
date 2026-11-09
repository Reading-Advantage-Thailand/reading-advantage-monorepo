#!/usr/bin/env node
/**
 * Tests for the Cloud Build upload allowlist of `scripts/ci/apps.json`.
 *
 * `gcloud builds submit` reads the root `.gcloudignore`. The pattern `apps/*` drops
 * every app folder. A gated app builds only when the file allowlists its two lines.
 * Without them, the Dockerfile path `apps/<id>` is absent from the upload.
 *
 * @module gcloudignore-apps.test
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./helpers/scratch.mjs";

/** The real root `.gcloudignore` text. */
const IGNORE = readFileSync(join(ROOT, ".gcloudignore"), "utf8");

/** The rows of the app table `scripts/ci/apps.json`. */
const ROWS = JSON.parse(
  readFileSync(join(ROOT, "scripts", "ci", "apps.json"), "utf8"),
);

/**
 * List the allowlist lines that a build needs and the given text misses.
 *
 * A row with mode `excluded` never builds, so it needs no allowlist line.
 *
 * @param {string} text The `.gcloudignore` text to check.
 * @param {Array<{id: string, path: string, mode: string}>} rows The app table rows.
 * @returns {string[]} The missing allowlist lines, in table order.
 */
function missingAllowlist(text, rows) {
  const lines = new Set(text.split("\n").map((line) => line.trim()));
  const missing = [];
  for (const row of rows) {
    if (row.mode === "excluded") continue;
    const dir = row.path.replace(/^apps\//, "");
    for (const line of [`!apps/${dir}`, `!apps/${dir}/**`]) {
      if (!lines.has(line)) missing.push(line);
    }
  }
  return missing;
}

describe(".gcloudignore upload allowlist", () => {
  it("allows every app that cd-apps builds", () => {
    expect(missingAllowlist(IGNORE, ROWS)).toEqual([]);
  });

  it("reports the primary and storytime lines when the text omits them", () => {
    const fixture = IGNORE.split("\n")
      .filter((line) => !line.startsWith("!apps/primary-advantage"))
      .filter((line) => !line.startsWith("!apps/storytime"))
      .join("\n");

    expect(missingAllowlist(fixture, ROWS)).toEqual([
      "!apps/primary-advantage",
      "!apps/primary-advantage/**",
      "!apps/storytime",
      "!apps/storytime/**",
    ]);
  });
});
