/**
 * Jest 30 Config-Shape Contract (Phase 1 artifact).
 *
 * THIS IS NOT A LIVE-BEHAVIOR TEST. It is a static shape check on
 * `apps/reading-advantage/jest.config.ts` source. It does not import
 * the wrapped config (which would force `next/jest.js` to evaluate
 * `next.config.js` at module load). It reads the source as text and
 * asserts the keys/values Jest 30 requires.
 *
 * Why a shape contract (not a live test):
 *   - Phase 1's deliverable is the audit matrix
 *     (`measure/tracks/jest30_major_migration/jest30-audit.md`).
 *   - The matrix commits to dropping `preset: "ts-jest"` (next/jest's
 *     SWC already handles TS), switching `testEnvironment` to the
 *     `'jsdom'` literal, and adding `coverageProvider: "v8"` for
 *     parity with `apps/advantage-games/jest.config.ts`.
 *   - The red behavioral proof (Jest 30 API path) belongs in
 *     Phase 2's `jest30-red.test.ts`, NOT here.
 *
 * Expected behavior:
 *   - FAILS on the current Jest 29 baseline (config still has
 *     `preset: "ts-jest"` and `testEnvironment: "jest-environment-jsdom"`).
 *   - PASSES after Phase 3 lands the §3 changes in `jest30-audit.md`.
 *
 * The test is intentionally bounded to a single small file. It does
 * not touch any other test, package, or config.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CONFIG_PATH = path.resolve(__dirname, "..", "jest.config.ts");

function readConfigSource(): string {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Expected jest config at ${CONFIG_PATH} but file is missing.`);
  }
  return fs.readFileSync(CONFIG_PATH, "utf8");
}

describe("jest30-config.contract — apps/reading-advantage/jest.config.ts", () => {
  const source = readConfigSource();

  test("does NOT declare the redundant ts-jest preset (next/jest SWC handles TS)", () => {
    expect(source).not.toMatch(/preset\s*:\s*["']ts-jest["']/);
  });

  test("uses the short 'jsdom' testEnvironment literal (Jest 30 convention)", () => {
    expect(source).toMatch(/testEnvironment\s*:\s*["']jsdom["']/);
  });

  test("does NOT use the full module-name 'jest-environment-jsdom' string", () => {
    expect(source).not.toMatch(/testEnvironment\s*:\s*["']jest-environment-jsdom["']/);
  });

  test("declares coverageProvider: 'v8' for parity with advantage-games", () => {
    expect(source).toMatch(/coverageProvider\s*:\s*["']v8["']/);
  });

  test("still loads jest.setup.ts (load-bearing for 81 reading-advantage tests)", () => {
    expect(source).toMatch(/setupFilesAfterEnv\s*:\s*\[\s*["']<rootDir>\/jest\.setup\.ts["']\s*\]/);
  });

  test("still wires next/jest (so Next config is loaded into the test env)", () => {
    expect(source).toMatch(/from\s+["']next\/jest(\.js)?["']/);
    expect(source).toMatch(/nextJest\s*\(/);
  });

  test("excludes Playwright E2E specs while preserving the app test root", () => {
    expect(source).toContain("testPathIgnorePatterns: [\"<rootDir>/tests/e2e/\"]");
  });
});
