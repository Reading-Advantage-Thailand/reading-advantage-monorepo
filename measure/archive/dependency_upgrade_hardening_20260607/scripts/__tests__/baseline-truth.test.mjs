#!/usr/bin/env node
/**
 * Phase 2 artifact-contract Red tests for the baseline-truth deliverable.
 *
 * `baseline-truth.md` is the durable record of pre-upgrade quality-gate
 * results for every workspace this track touches. It exists so the Phase 3
 * batch gates and Phase 4 aggregate gates can attribute new failures to the
 * upgrade itself rather than to pre-existing baseline debt (see
 * `test-strategy.md` §1, §8 and `spec.md` Acceptance Criteria #10).
 *
 * The live-behavior proof is owned by:
 *   - Phase 3 per-batch quality gates (which actually run the commands), and
 *   - Phase 4 aggregate `pnpm turbo run lint|test|check-types|build` closeout.
 *
 * This Red asserts the artifact schema, not the live command output. It is
 * intentionally bounded to a single file read.
 *
 * Bounded scope:
 *   - Reads `baseline-truth.md` as a string if present.
 *   - Asserts required headings and per-workspace columns.
 *   - Never spawns pnpm, jest, vitest, turbo, or any workspace command.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_TRUTH_PATH = resolve(
  __dirname,
  "..",
  "..",
  "baseline-truth.md",
);

/**
 * Reads `baseline-truth.md` if present.
 * @returns {string|null} File contents, or null when the artifact is absent.
 */
function readBaselineTruth() {
  if (!existsSync(BASELINE_TRUTH_PATH)) return null;
  return readFileSync(BASELINE_TRUTH_PATH, "utf8");
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

test("baseline-truth.md exists at the documented path", () => {
  assert.ok(
    existsSync(BASELINE_TRUTH_PATH),
    `baseline-truth.md must exist at ${BASELINE_TRUTH_PATH} so Phase 3/4 gates can attribute regressions correctly (per test-strategy.md §1 and §8)`,
  );
});

test("baseline-truth.md records the source commit SHA the gates were run against", () => {
  const content = readBaselineTruth();
  assert.ok(content, "baseline-truth.md must exist");
  const section = extractSection(content, "Source Commit");
  assert.ok(
    section,
    "baseline-truth.md must contain a '## Source Commit' section so Phase 4 reconciliation can re-run the gates at the same SHA",
  );
  // The recorded SHA must be a non-empty short or long git SHA.
  assert.match(
    section,
    /\b[0-9a-f]{7,40}\b/,
    "Source Commit section must record at least one valid git SHA",
  );
});

test("baseline-truth.md lists every affected workspace from the upgrade matrix", () => {
  const content = readBaselineTruth();
  assert.ok(content, "baseline-truth.md must exist");
  const section = extractSection(content, "Affected Workspaces");
  assert.ok(
    section,
    "baseline-truth.md must contain a '## Affected Workspaces' section enumerating every workspace the track touches",
  );
  // At minimum every app the matrix names as a dependent must appear.
  // The six apps are the only ones the spec calls out as "all six".
  const requiredWorkspaces = [
    "reading-advantage",
    "primary-advantage",
    "science-advantage",
    "codecamp-advantage",
    "www-reading-advantage",
    "vocabulary-games",
  ];
  for (const ws of requiredWorkspaces) {
    assert.match(
      section,
      new RegExp(`\\b${ws}\\b`),
      `Affected Workspaces section must list '${ws}'`,
    );
  }
});

test("baseline-truth.md records a per-workspace gate-result row for lint/test/check-types/build", () => {
  const content = readBaselineTruth();
  assert.ok(content, "baseline-truth.md must exist");
  const section = extractSection(content, "Per-Workspace Gate Results");
  assert.ok(
    section,
    "baseline-truth.md must contain a '## Per-Workspace Gate Results' section",
  );
  // The matrix must use a markdown table whose header lists the four gates
  // every batch in the upgrade-matrix.md will exercise.
  for (const gate of ["lint", "test", "check-types", "build"]) {
    assert.match(
      section,
      new RegExp(`\\b${gate}\\b`),
      `Per-Workspace Gate Results must include a column or row for the '${gate}' gate`,
    );
  }
});

test("baseline-truth.md carves out pre-existing failures so they do not block this track", () => {
  const content = readBaselineTruth();
  assert.ok(content, "baseline-truth.md must exist");
  const section = extractSection(content, "Pre-Existing Failures Carved Out");
  assert.ok(
    section,
    "baseline-truth.md must contain a '## Pre-Existing Failures Carved Out' section listing every baseline failure that this track explicitly does not own (per test-strategy.md §8)",
  );
  // The two known pre-existing failures the strategy doc names must appear:
  //   primary-advantage 49 ESLint errors, Jest/Vitest runner mix.
  assert.match(
    section,
    /primary-advantage.*49|49.*primary-advantage/i,
    "Pre-Existing Failures must call out the primary-advantage 49 ESLint errors recorded in tech-debt.md",
  );
  assert.match(
    section,
    /jest.*vitest|vitest.*jest/i,
    "Pre-Existing Failures must call out the Jest/Vitest runner mix recorded in tech-debt.md",
  );
});
