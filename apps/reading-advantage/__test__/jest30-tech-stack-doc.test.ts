/**
 * Jest 30 Migration - Phase 4 Validate-and-Close doc contract.
 *
 * This is the artifact assertion for Phase 4 Task 3 (Update
 * measure/tech-stack.md with the selected Jest version). The phase
 * deliverable IS the doc itself, so per
 * measure/tracks/jest30_major_migration/test-strategy.md section 4 the
 * markdown assertion is allowed here. It is paired with the
 * live-behavior aggregate gate (Phase 4 Task 1) which the
 * implementer owns - this test only verifies the doc contract.
 *
 * Why a doc contract (not a TypeScript-typed Jest 30 API path):
 *
 *   - Phase 4 Task 3 deliverable is a Measure doc update, not a
 *     runtime change. The migration runtime gate is owned by the
 *     Phase 1 (jest30-config.contract.test.ts) and Phase 2
 *     (jest30-red.test.ts) tests, both of which already pass at HEAD
 *     (post-Phase-3 Green at dc246e79).
 *   - This file fails at the pre-closeout HEAD because the doc does
 *     not yet specify the selected Jest version.
 *   - It is bounded to a single small file: it reads
 *     measure/tech-stack.md once and asserts four shape facts. No
 *     full-suite smoke, no watch mode, no config import.
 *
 * Expected behavior:
 *
 *   - FAILS at the pre-Phase-4-closeout HEAD (current state: the doc
 *     lists Jest under Testing but does not specify Jest 30.x as the
 *     selected version).
 *   - PASSES after the implementer updates the Selected Shared
 *     Versions table to record the Jest 30.x version chosen at
 *     dc246e79 (jest 29.7.0 -> 30.2.0 in
 *     apps/reading-advantage/package.json, plus
 *     jest-environment-jsdom 30.2.0 and @types/jest 30.0.0).
 *
 * The test is intentionally narrow. It does not check the full
 * contents of the table - only the four facts the spec.md acceptance
 * criterion 7 requires.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TECH_STACK_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "measure",
  "tech-stack.md",
);

function readTechStack(): string {
  if (!fs.existsSync(TECH_STACK_PATH)) {
    throw new Error("Expected tech-stack.md at " + TECH_STACK_PATH);
  }
  return fs.readFileSync(TECH_STACK_PATH, "utf8");
}

describe("jest30-tech-stack-doc measure tech-stack.md mentions selected Jest 30 version", () => {
  const doc = readTechStack();

  test("mentions Jest 30 (or Jest 30.x) somewhere in the doc", () => {
    // Loose shape - the implementer may write Jest 30, Jest 30.x,
    // Jest ^30, or jest@^30 per the table style. All of these
    // satisfy the spec.md AC 7.
    expect(doc).toMatch(/Jest\s+(30|\^30|30\.|30\.x)/i);
  });

  test("records jest at a 30.x version in the selected-versions table", () => {
    // Look for a table row with a jest package whose version starts
    // with 30. Matches | jest | 30.x.x | ... style rows. The
    // version may be pinned (30.3.0) or ranged (^30.2.0).
    expect(doc).toMatch(/\|\s*jest\s*\|\s*\^?30\./i);
  });

  test("records jest-environment-jsdom at a 30.x version (matched pair)", () => {
    // Per jest30-audit.md section 1 and the Phase 3 package.json
    // bump (dc246e79), jest-environment-jsdom moved to 30.x in
    // lockstep.
    expect(doc).toMatch(/\|\s*jest-environment-jsdom\s*\|\s*\^?30\./i);
  });

  test("records @types/jest at a 30.x version (TS drift guarded per audit section 3 row 2)", () => {
    // Per jest30-audit.md section 3 row 2 (@types/jest drift), the
    // TypeScript types bump must be in lockstep with the runtime.
    expect(doc).toMatch(/\|\s*@types\/jest\s*\|\s*\^?30\./i);
  });
});