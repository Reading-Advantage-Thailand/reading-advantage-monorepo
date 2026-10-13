/**
 * Contract: the catalogue Cloud Build fetches the Workbooks archive, refuses a legacy database,
 * builds `@reading-advantage/db`, then imports the five printed books and the teacher guide
 * (primary_parity_class_books_20261011, S1).
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
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

  it("builds every workspace package that the two import scripts load, db first", () => {
    // Walk the relative imports of both scripts and collect the `@reading-advantage/*` packages.
    const seen = new Set<string>();
    const packages = new Set<string>();
    const walk = (file: string): void => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = readFileSync(file, "utf8");
      for (const m of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
        const spec = m[1];
        if (spec.startsWith("@reading-advantage/")) packages.add(spec.split("/").slice(0, 2).join("/"));
        else if (spec.startsWith(".")) {
          const base = resolve(dirname(file), spec.replace(/\.js$/, ""));
          const next = [`${base}.ts`, join(base, "index.ts")].find((c) => existsSync(c));
          if (next) walk(next);
        }
      }
    };
    walk(join(PACKAGE_ROOT, "scripts/import-lesson-packages.ts"));
    walk(join(PACKAGE_ROOT, "scripts/import-lesson-guides.ts"));
    packages.delete("@reading-advantage/domain");
    expect([...packages].sort()).toEqual(["@reading-advantage/auth", "@reading-advantage/db"]);
    const positions = ["@reading-advantage/db", "@reading-advantage/auth"].map((name) =>
      importStep.indexOf(`pnpm --filter ${name} build`),
    );
    expect(positions.every((index) => index >= 0)).toBe(true);
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(importStep.indexOf("import-lesson-packages"));
  });

  it("pins the secret version instead of latest", () => {
    expect(CLOUDBUILD).toContain("versions/${_TARGET_SECRET_VERSION}");
    expect(CLOUDBUILD).not.toContain("versions/latest");
    expect(CLOUDBUILD).toMatch(/_TARGET_SECRET_VERSION: "1"/);
  });

  it("stops when the print data line does not show every lesson stored", () => {
    expect(importStep).toContain('grep -q "Print data: $$EXPECTED stored"');
    expect(importStep).toContain("STOP: expected $$EXPECTED lessons with print data");
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

  it("documents the print files of the archive layout and passes the export commit", () => {
    const header = CLOUDBUILD.split("\nsteps:")[0];
    expect(header).toContain("content/primary/{origins-1,origins-2,origins-3.1,origins-3.2,quest-4}/print/*.json");
    expect(importStep).toContain("--workbooks-commit");
  });
});
