import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { StandardAssetCatalog } from "./standard-pack-release.js";

/** Reads the generated standard catalog from either package-local or workspace-root Vitest execution. */
export function readStandardPackCatalogFixture(): StandardAssetCatalog {
  const candidates = [
    resolve(process.cwd(), "assets/standard/standard-pack-release.json"),
    resolve(process.cwd(), "packages/advantage-play-kit/assets/standard/standard-pack-release.json"),
  ];
  const catalogPath = candidates.find((candidate) => existsSync(candidate));
  if (!catalogPath) throw new Error("Unable to locate standard-pack-release.json from the current test workspace");
  return JSON.parse(readFileSync(catalogPath, "utf8")) as StandardAssetCatalog;
}

/** Reads the cohort suitability guard source from either package-local or workspace-root Vitest execution. */
export function readStandardPackCohortGuardSource(): string {
  const candidates = [
    resolve(process.cwd(), "src/assets/standard-pack-cohort-suitability.ts"),
    resolve(process.cwd(), "packages/advantage-play-kit/src/assets/standard-pack-cohort-suitability.ts"),
  ];
  const sourcePath = candidates.find((candidate) => existsSync(candidate));
  if (!sourcePath) throw new Error("Unable to locate standard-pack-cohort-suitability.ts from the current test workspace");
  return readFileSync(sourcePath, "utf8");
}
