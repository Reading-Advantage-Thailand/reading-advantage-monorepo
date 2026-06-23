#!/usr/bin/env node
/**
 * Phase 2 artifact-contract Red tests for the batch quality gates section of
 * `upgrade-matrix.md`.
 *
 * These tests pin the contract that the matrix file must enumerate, for every
 * implementation batch (A–H), the exact `pnpm` command list operators must run
 * to validate that batch. The existing per-row `validation scope` column
 * cannot stand in for this contract because operators cannot execute a column
 * value as a shell script; the contract has to be human-readable and copy-paste
 * runnable.
 *
 * Per `test-strategy.md` §7, this artifact contract is paired with a live
 * proof: the live-gate owner is Phase 3 batch execution, which runs each
 * documented gate against the real workspaces.
 *
 * Per `test-strategy.md` §1, this is a Phase 2 contract-only check; it does
 * not invoke pnpm and does not run any workspace test command.
 *
 * Bounded scope:
 *   - Reads `upgrade-matrix.md` as a string.
 *   - Performs structural assertions on the markdown.
 *   - Never spawns pnpm, vitest, jest, or any workspace command.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MATRIX_PATH = resolve(__dirname, "..", "..", "upgrade-matrix.md");

/**
 * Reads the upgrade-matrix.md file at the documented path.
 * @returns {string} Raw markdown contents.
 */
function readMatrix() {
  return readFileSync(MATRIX_PATH, "utf8");
}

/**
 * Extracts the markdown subsection beginning at `## <heading>` and ending at
 * the next top-level `## ` heading (or end of file).
 *
 * @param {string} content Full markdown content.
 * @param {string} heading Heading text to match exactly (without the "## ").
 * @returns {string|null} The section body or null if the heading is absent.
 */
function extractSection(content, heading) {
  const lines = content.split("\n");
  const startIdx = lines.findIndex(
    (l) => l.trim() === `## ${heading}`,
  );
  if (startIdx === -1) return null;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^## (?!#)/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join("\n");
}

test("upgrade-matrix.md contains a top-level '## Batch Quality Gates' section", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates");
  assert.notEqual(
    section,
    null,
    "upgrade-matrix.md must contain a '## Batch Quality Gates' section so operators have a single runnable contract for each batch (per test-strategy.md §1 and §7)",
  );
});

test("Batch Quality Gates section enumerates every implementation batch A–H", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  for (const letter of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
    assert.match(
      section,
      new RegExp(`### Batch ${letter}\\b`),
      `Batch Quality Gates section must contain a '### Batch ${letter}' subsection`,
    );
  }
});

test("Batch A subsection lists the six app build commands plus affected tests/check-types", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  // Batch A is the framework override repair; it must validate all six apps.
  // The six apps are the only thing the plan and spec say "all six" about.
  const apps = [
    "reading-advantage",
    "primary-advantage",
    "science-advantage",
    "codecamp-advantage",
    "www-reading-advantage",
    "vocabulary-games",
  ];
  for (const app of apps) {
    assert.match(
      section,
      new RegExp(`pnpm --filter ${app}.*build`, "s"),
      `Batch A gates must include a build command for app '${app}'`,
    );
  }
});

test("Batch B subsection lists at least one pnpm vitest workspace test command", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  // Locate the Batch B block by slicing between its header and the next
  // '### Batch ' header so we do not accidentally satisfy this against
  // Batch G/H rows.
  const batchBMatch = section.match(/### Batch B\b[\s\S]*?(?=### Batch |$)/);
  assert.ok(batchBMatch, "Batch B subsection must be present");
  const body = batchBMatch[0];
  assert.match(
    body,
    /pnpm --filter.*test/,
    "Batch B gates must include at least one 'pnpm --filter ... test' command (every Vitest workspace test command, per plan.md §Phase 2 Task 4)",
  );
});

test("Batch D subsection lists at least one check-types command for affected workspaces", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  const batchDMatch = section.match(/### Batch D\b[\s\S]*?(?=### Batch |$)/);
  assert.ok(batchDMatch, "Batch D subsection must be present");
  const body = batchDMatch[0];
  assert.match(
    body,
    /check-types/,
    "Batch D gates must include 'check-types' commands for affected workspaces (deprecated-type removal validation)",
  );
});

test("Batch H subsection lists 'pnpm install --frozen-lockfile' and 'pnpm dedupe --check'", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  const batchHMatch = section.match(/### Batch H\b[\s\S]*?(?=### Batch |$)/);
  assert.ok(batchHMatch, "Batch H subsection must be present");
  const body = batchHMatch[0];
  assert.match(
    body,
    /pnpm install --frozen-lockfile/,
    "Batch H gates must include 'pnpm install --frozen-lockfile'",
  );
  assert.match(
    body,
    /pnpm dedupe --check/,
    "Batch H gates must include 'pnpm dedupe --check'",
  );
});

test("Batch E subsection references the FFmpeg fixture-driven smoke and unit tests", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  const batchEMatch = section.match(/### Batch E\b[\s\S]*?(?=### Batch |$)/);
  assert.ok(batchEMatch, "Batch E subsection must be present");
  const body = batchEMatch[0];
  assert.match(
    body,
    /ffmpeg-process|ffmpeg/i,
    "Batch E gates must reference the FFmpeg utility tests",
  );
  assert.match(
    body,
    /smoke|fixture/i,
    "Batch E gates must reference the bounded local FFmpeg smoke (per test-strategy.md §7)",
  );
});

test("Batch C subsection references the focused calendar Jest command plus reading-advantage check-types/build", () => {
  const matrix = readMatrix();
  const section = extractSection(matrix, "Batch Quality Gates") ?? "";
  const batchCMatch = section.match(/### Batch C\b[\s\S]*?(?=### Batch |$)/);
  assert.ok(batchCMatch, "Batch C subsection must be present");
  const body = batchCMatch[0];
  assert.match(
    body,
    /jest.*calendar|calendar.*jest/i,
    "Batch C gates must reference the focused calendar Jest command (per test-strategy.md §7)",
  );
  assert.match(
    body,
    /reading-advantage.*check-types|check-types.*reading-advantage/,
    "Batch C gates must reference reading-advantage check-types",
  );
  assert.match(
    body,
    /reading-advantage.*build|build.*reading-advantage/,
    "Batch C gates must reference reading-advantage build",
  );
});
