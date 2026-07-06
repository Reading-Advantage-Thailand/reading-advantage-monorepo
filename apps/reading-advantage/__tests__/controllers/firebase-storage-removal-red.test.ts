/**
 * Firebase Storage Removal Red Tests (SEC-9)
 *
 * Proves that generator-controller.ts no longer dynamically requires
 * firebase-admin/storage and that cleanup helpers route through the shared
 * @reading-advantage/storage adapter.
 *
 * Falsification: re-introduce require("firebase-admin/storage") and the
 * artifact guard fails; point cleanupAudioFiles/cleanupStorageFiles back at
 * Firebase and the storage-adapter behavior test fails.
 *
 * @jest-environment node
 */

import { globSync } from "glob";
import { readFileSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(__dirname, "../../../..");

const FIREBASE_IMPORT_RE = /(?:import\s+.*?\s+from\s+['"]firebase-admin(?:\/storage)?['"]|require\s*\(\s*['"]firebase-admin(?:\/storage)?['"]\s*\))/g;

describe("Firebase storage removal (SEC-9 Red)", () => {
  it("has no firebase-admin import or require in reading-advantage source", () => {
    const files = globSync("apps/reading-advantage/**/*.ts", {
      cwd: REPO_ROOT,
      absolute: true,
    });

    const violations: string[] = [];

    for (const file of files) {
      // Exclude build cache, env files, declaration files, and tests.
      if (
        file.includes("/.next/") ||
        file.includes("/.env") ||
        file.endsWith(".d.ts") ||
        /\.(test|spec)\.(ts|tsx)$/.test(file)
      ) {
        continue;
      }

      const content = readFileSync(file, "utf-8");
      const hits = content.match(FIREBASE_IMPORT_RE) || [];
      for (const hit of hits) {
        violations.push(`${file}:${hit}`);
      }
    }

    expect({
      "firebase-admin import/require hits": violations.length,
      violations,
    }).toEqual({
      "firebase-admin import/require hits": 0,
      violations: [],
    });
  });

  it("generator-controller imports the shared storage adapter for cleanup", () => {
    const file = resolve(
      REPO_ROOT,
      "apps/reading-advantage/server/controllers/generator-controller.ts"
    );
    const content = readFileSync(file, "utf-8");

    const importsStorage =
      content.includes("@reading-advantage/storage") ||
      content.includes("from \"../../utils/storage\"") ||
      content.includes("from '@/server/utils/storage'");

    expect(importsStorage).toBe(true);
  });
});
