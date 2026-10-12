/**
 * Contract: the catalogue Cloud Build fetches the Workbooks archive, refuses a legacy database,
 * builds `@reading-advantage/db`, then imports the five printed books and the teacher guide
 * (primary_parity_class_books_20261011, S1).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BOOKS } from "../mapping.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CLOUDBUILD = readFileSync(
  join(PACKAGE_ROOT, "../../apps/primary-advantage/cloudbuild-catalogue.yaml"),
  "utf8",
);

/** The folders of the five printed books in the Workbooks archive, by `BOOKS` key. */
const FOLDERS: Record<string, string> = {
  o1: "origins-1",
  o2: "origins-2",
  "o3-1": "origins-3.1",
  "o3-2": "origins-3.2",
  q4: "quest-4",
};

/** Splits the Cloud Build file into step blocks keyed by step id. */
function stepBlocks(): Map<string, string> {
  const blocks = new Map<string, string>();
  for (const block of CLOUDBUILD.split(/\n\s*-\s*name:\s*/).slice(1)) {
    const id = block.match(/id:\s*"([^"]+)"/)?.[1];
    if (id) blocks.set(id, block);
  }
  return blocks;
}

describe("Primary catalogue Cloud Build", () => {
  const blocks = stepBlocks();
  const importStep = blocks.get("import") ?? "";

  it("fetches the archive, installs without the secret, then imports", () => {
    expect([...blocks.keys()]).toEqual(["fetch-archive", "install", "import"]);
    expect(blocks.get("install")).toContain("pnpm install --frozen-lockfile");
    expect(blocks.get("install")).not.toContain("secretEnv");
    expect(blocks.get("install")).not.toContain("DIRECT_DATABASE_URL");
    expect(importStep).not.toContain("pnpm install");
    expect(blocks.get("fetch-archive")).toContain("archive commit:");
    expect(blocks.get("fetch-archive")).toContain("gcloud storage cp");
    expect(blocks.get("fetch-archive")).toContain("_WORKBOOKS_ARCHIVE");
  });

  it("refuses a legacy database, builds the db package, then imports packages, then guides", () => {
    const order = [
      "scripts/refuse-legacy-db.ts",
      "pnpm --filter @reading-advantage/db build",
      "import-lesson-packages",
      "import-lesson-guides --workbooks",
    ].map((text) => importStep.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("names a folder for each key of BOOKS and no other folder", () => {
    expect(Object.keys(FOLDERS).sort()).toEqual(Object.keys(BOOKS).sort());
    const used = [...importStep.matchAll(/content\/primary\/([\w.-]+)"/g)].map((m) => m[1]);
    expect(used.sort()).toEqual(Object.values(FOLDERS).sort());
  });

  it("uses DIRECT_DATABASE_URL as the only secret and prints no environment value", () => {
    expect(CLOUDBUILD.match(/env:\s*"([^"]+)"/g)).toEqual(['env: "DIRECT_DATABASE_URL"']);
    expect(importStep).toMatch(/secretEnv:\s*\["DIRECT_DATABASE_URL"\]/);
    expect(CLOUDBUILD).not.toMatch(/\b(env|printenv|set -x)\b(?!:)/);
    expect(CLOUDBUILD).not.toMatch(/echo[^\n]*\$\$?\{?DIRECT_DATABASE_URL/);
  });

  it("fails the build on a failed package, a wrong count, or a short guide", () => {
    expect(importStep).toContain("set -euo pipefail");
    expect(importStep).toContain("a package failed");
    expect(importStep).toContain("expected $$EXPECTED lessons");
    expect(importStep).toContain("^$$l: 13 steps, 13 with a script");
    expect(importStep).toContain("FAILED");
  });

  it("redacts database URLs from the printed lines", () => {
    expect(importStep).toContain("postgres(ql)?://");
  });
});
