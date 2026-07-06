/**
 * Raw process.env Guard (SEC-7)
 *
 * Produces a labeled count of raw process.env.X reads outside the validated
 * env module and test files. The Red state is a non-zero count; Green moves
 * all env access into apps/reading-advantage/lib/env.ts.
 *
 * Falsification: add a raw process.env.FOO read in app/server/lib source and
 * the labeled count rises.
 *
 * @jest-environment node
 */

import { globSync } from "glob";
import { readFileSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(__dirname, "../../../..");

const SCAN_GLOBS = [
  "apps/reading-advantage/server/**/*.ts",
  "apps/reading-advantage/lib/**/*.ts",
  "apps/reading-advantage/app/**/*.ts",
];

const EXCLUDE_PATH_PATTERNS = [
  // The canonical validated env module
  /apps\/reading-advantage\/lib\/env\.ts$/,
  // Test files are allowed to manipulate env for fixtures
  /\.(test|spec)\.(ts|tsx)$/,
  // Next.js type declarations
  /\.d\.ts$/,
];

const PROCESS_ENV_RE = /process\.env\.[A-Za-z_][A-Za-z0-9_]*/g;

describe("raw process.env reads guard (SEC-7 Red)", () => {
  it("reports zero raw process.env reads outside lib/env.ts and tests", () => {
    const matches: string[] = [];

    for (const pattern of SCAN_GLOBS) {
      const files = globSync(pattern, { cwd: REPO_ROOT, absolute: true });
      for (const file of files) {
        if (EXCLUDE_PATH_PATTERNS.some((ex) => ex.test(file))) {
          continue;
        }

        const content = readFileSync(file, "utf-8");
        const hits = content.match(PROCESS_ENV_RE) || [];
        for (const hit of hits) {
          matches.push(`${file}:${hit}`);
        }
      }
    }

    const labeledCount = matches.length;

    expect({
      "Raw process.env hits outside validated env module": labeledCount,
      hits: matches.slice(0, 20),
    }).toEqual({
      "Raw process.env hits outside validated env module": 0,
      hits: [],
    });
  });
});
