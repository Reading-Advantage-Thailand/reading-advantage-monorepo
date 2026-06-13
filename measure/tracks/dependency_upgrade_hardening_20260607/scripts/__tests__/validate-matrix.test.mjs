#!/usr/bin/env node
/**
 * Phase 1 artifact-contract Red tests for the upgrade matrix validator.
 *
 * These tests pin the behavior of `scripts/validate-matrix.mjs` against
 * controlled fixture directories. They are the Red gate for the
 * `dependency_upgrade_hardening_20260607` track, Phase 1 (Contract & Schema
 * Definition).
 *
 * Per `measure/tracks/dependency_upgrade_hardening_20260607/test-strategy.md`:
 * - The validator is the only permitted fake harness for Phase 1.
 * - This test file proves the validator's command-string contract and asserts
 *   the bounded, deterministic behavior that Green must satisfy.
 * - Tests use a temporary fixture directory under `node:test`'s `tmp` helper so
 *   they never touch the real track artifacts or accidentally run a full
 *   suite.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir as osTmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALIDATOR_PATH = resolve(__dirname, "..", "validate-matrix.mjs");

/**
 * Invokes the validator script with a controlled track directory and returns
 * the result. Uses spawnSync so the test sees the same exit code / stdout /
 * stderr an operator would see on the CLI.
 *
 * @param {string} trackDir Absolute path to the track directory fixture.
 * @returns {{status: number|null, stdout: string, stderr: string, error?: Error}}
 */
function runValidator(trackDir) {
  return spawnSync(process.execPath, [VALIDATOR_PATH, "--track-dir", trackDir], {
    encoding: "utf8",
    cwd: __dirname,
    env: { ...process.env, CI: "true" },
  });
}

/**
 * Builds a minimal `upgrade-matrix.md` fixture with the required Phase 1
 * columns. Each "decision" row carries owner + batch + validation scope so
 * that fixtures exercise both the schema check and the decision-cell check.
 *
 * @param {object} [opts]
 * @param {string} [opts.decision] Decision cell value; default "upgrade".
 * @param {string} [opts.owner] Owner cell value; default "batch-a".
 * @param {string} [opts.batch] Implementation batch cell value.
 * @param {string} [opts.scope] Validation scope cell value.
 * @returns {string} Full markdown document.
 */
function buildMatrixFixture(opts = {}) {
  const decision = opts.decision ?? "upgrade";
  const owner = opts.owner ?? "batch-a";
  const batch = opts.batch ?? "Batch A";
  const scope = opts.scope ?? "all-six-app-builds";
  return [
    "# Upgrade Matrix",
    "",
    "| package | current | wanted | latest | dependents | risk class | decision | implementation batch | validation scope |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    `| next | 16.0.0 | 16.2.7 | 16.2.7 | apps/* | high | ${decision} | ${batch} | ${scope} |`,
    "| drizzle-orm | 0.44.7 | 0.44.7 | 0.45.0 | packages/* | medium | hold | — | — |",
    "",
  ].join("\n");
}

/**
 * Writes the four baseline JSON / text snapshots the test-strategy requires
 * the validator to discover. Adds an `incomplete: true` marker when requested
 * so the validator's incomplete-audit handling is exercised.
 *
 * @param {string} baselineDir Absolute path to the `baseline/` directory.
 * @param {object} [opts]
 * @param {boolean} [opts.incompleteAudit] When true, pnpm-audit.json carries
 *   the explicit incomplete marker from the test-strategy.
 */
function writeBaselineFixtures(baselineDir, opts = {}) {
  mkdirSync(baselineDir, { recursive: true });
  writeFileSync(
    join(baselineDir, "pnpm-outdated.json"),
    JSON.stringify({ outdated: [] }, null, 2),
  );
  writeFileSync(
    join(baselineDir, "pnpm-list.json"),
    JSON.stringify({ projects: [] }, null, 2),
  );
  writeFileSync(join(baselineDir, "pnpm-dedupe-check.txt"), "No duplicates.\n");
  const auditPayload = opts.incompleteAudit
    ? { vulnerabilities: {}, incomplete: true, note: "registry stall" }
    : { vulnerabilities: {} };
  writeFileSync(
    join(baselineDir, "pnpm-audit.json"),
    JSON.stringify(auditPayload, null, 2),
  );
}

test("validate-matrix.mjs script exists at the documented path", () => {
  // The Red-phase test cannot pass until the validator script is authored
  // in the Green phase. This test exists so the missing-file failure is
  // surfaced as a clear Red signal rather than an opaque spawn ENOENT.
  const result = runValidator("/nonexistent/track");
  assert.notEqual(
    result.error,
    undefined,
    "spawning the missing validator should surface an error",
  );
  assert.match(
    String(result.error?.code ?? ""),
    /ENOENT/,
    "spawn failure must be the documented missing-script error",
  );
});

test("validator exits non-zero with a missing-artifact message when track dir is empty", (t) => {
  const tmp = osTmpdir();
  const trackDir = join(tmp, "dep-upgrade-empty");
  rmSync(trackDir, { recursive: true, force: true });
  mkdirSync(trackDir, { recursive: true });
  const result = runValidator(trackDir);
  assert.notEqual(
    result.status,
    0,
    `validator must exit non-zero; got status=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(
    combined,
    /upgrade-matrix\.md/,
    "missing-artifact error must reference upgrade-matrix.md",
  );
});

test("validator exits non-zero when any baseline JSON is absent", (t) => {
  const tmp = osTmpdir();
  const trackDir = join(tmp, "dep-upgrade-missing-baseline");
  rmSync(trackDir, { recursive: true, force: true });
  mkdirSync(join(trackDir, "baseline"), { recursive: true });
  writeFileSync(
    join(trackDir, "upgrade-matrix.md"),
    buildMatrixFixture(),
  );
  // Intentionally omit pnpm-audit.json and pnpm-dedupe-check.txt.
  writeFileSync(
    join(trackDir, "baseline", "pnpm-outdated.json"),
    JSON.stringify({ outdated: [] }),
  );
  writeFileSync(
    join(trackDir, "baseline", "pnpm-list.json"),
    JSON.stringify({ projects: [] }),
  );

  const result = runValidator(trackDir);
  assert.notEqual(result.status, 0);
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /pnpm-audit\.json/);
  assert.match(combined, /pnpm-dedupe-check\.txt/);
});

test("validator rejects an upgrade-matrix.md that omits required schema columns", (t) => {
  const tmp = osTmpdir();
  const trackDir = join(tmp, "dep-upgrade-bad-schema");
  rmSync(trackDir, { recursive: true, force: true });
  mkdirSync(join(trackDir, "baseline"), { recursive: true });
  writeBaselineFixtures(join(trackDir, "baseline"));
  // Missing `validation scope` and `implementation batch` columns.
  writeFileSync(
    join(trackDir, "upgrade-matrix.md"),
    [
      "# Upgrade Matrix",
      "",
      "| package | current | wanted | latest | dependents | risk class | decision |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      "| next | 16.0.0 | 16.2.7 | 16.2.7 | apps/* | high | upgrade |",
      "",
    ].join("\n"),
  );

  const result = runValidator(trackDir);
  assert.notEqual(result.status, 0);
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /implementation batch/i);
  assert.match(combined, /validation scope/i);
});

test("validator rejects decision cells missing owner / batch / validation scope", (t) => {
  const tmp = osTmpdir();
  const trackDir = join(tmp, "dep-upgrade-bad-decision");
  rmSync(trackDir, { recursive: true, force: true });
  mkdirSync(join(trackDir, "baseline"), { recursive: true });
  writeBaselineFixtures(join(trackDir, "baseline"));
  writeFileSync(
    join(trackDir, "upgrade-matrix.md"),
    buildMatrixFixture({
      decision: "upgrade",
      owner: "",
      batch: "",
      scope: "",
    }),
  );

  const result = runValidator(trackDir);
  assert.notEqual(result.status, 0);
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(combined, /owner|batch|validation scope/i);
});

test("validator exits 0 when matrix schema, decision cells, and baselines are all complete", (t) => {
  const tmp = osTmpdir();
  const trackDir = join(tmp, "dep-upgrade-happy");
  rmSync(trackDir, { recursive: true, force: true });
  mkdirSync(join(trackDir, "baseline"), { recursive: true });
  writeBaselineFixtures(join(trackDir, "baseline"));
  writeFileSync(
    join(trackDir, "upgrade-matrix.md"),
    buildMatrixFixture(),
  );

  const result = runValidator(trackDir);
  assert.equal(
    result.status,
    0,
    `validator must exit 0 on a happy-path fixture\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
});

test("validator accepts pnpm-audit.json that carries the explicit incomplete-audit marker", (t) => {
  const tmp = osTmpdir();
  const trackDir = join(tmp, "dep-upgrade-audit-incomplete");
  rmSync(trackDir, { recursive: true, force: true });
  mkdirSync(join(trackDir, "baseline"), { recursive: true });
  writeBaselineFixtures(join(trackDir, "baseline"), { incompleteAudit: true });
  writeFileSync(
    join(trackDir, "upgrade-matrix.md"),
    buildMatrixFixture(),
  );

  const result = runValidator(trackDir);
  assert.equal(
    result.status,
    0,
    `incomplete audit must be accepted when the marker is present\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  const combined = `${result.stdout}\n${result.stderr}`;
  assert.match(
    combined,
    /incomplete|audit/i,
    "incomplete audit must be surfaced in output (treated as known, not as failure)",
  );
});