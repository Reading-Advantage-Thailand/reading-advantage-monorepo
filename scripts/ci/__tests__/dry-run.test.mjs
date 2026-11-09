#!/usr/bin/env node
/**
 * Dry-run characterization cases for Phase 4 task 4.1 of the track
 * `per_app_cicd_20261107`.
 *
 * The cases are DR-00 to DR-11 of
 * `measure/tracks/per_app_cicd_20261107/test-strategy.md` section P4.3. Each app row
 * adds one file under `<row.path>/` to a scratch repository and runs the real select
 * step of `cd-www-reading-advantage.yml`, `cd-apps.yml`, and `ci.yml` on that range.
 * The file makes no gcloud call, reads no secret, and deploys nothing. The fake
 * `gcloud` of the harness only logs its arguments.
 *
 * Run with the Red command of test-strategy section P4.3.
 *
 * @module dry-run.test
 */
import { execFileSync } from "node:child_process";
import { afterAll, describe, it } from "vitest";
import { removeScratchDirs, requireNonEmpty } from "./helpers/scratch.mjs";
import {
  planRepo,
  readTable,
  removePlanScratch,
  runSelect,
  selectStep,
  stepText,
  workflow,
} from "./helpers/plan.mjs";

const WWW = "cd-www-reading-advantage.yml";
const APPS = "cd-apps.yml";
const CI = "ci.yml";

/** The 10 rows of the app table, read before the loop. */
const TABLE = readTable();

/** The labeled data lines of the run, one per case DR-01 to DR-11. */
const LINES = [];

/** The number of `ci.yml` select runs so far. */
let ciRanges = 0;

/**
 * Throw when a condition is false.
 *
 * @param {unknown} condition The condition.
 * @param {string} message The failure message.
 * @returns {void}
 */
function must(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Join the text of a select step, environment and run text.
 *
 * @param {string} name The workflow file name.
 * @returns {string} The text of the select step.
 */
function selectText(name) {
  const step = selectStep(workflow(name), name);
  return `${stepText(step)}\n${String(step.run ?? "")}`;
}

/** The number of `secrets.` references in the three select steps. */
const SELECT_SECRET_REFS = [WWW, APPS, CI].reduce(
  (sum, name) => sum + (selectText(name).match(/secrets\./g) ?? []).length,
  0,
);

/**
 * Read the app ids that `scripts/ci/affected-apps.mjs` returns for a range.
 *
 * @param {{ dir: string, base: string, head: string }} range The scratch range.
 * @returns {string[]} The affected app ids.
 */
function scriptIds(range) {
  const stdout = execFileSync(
    "node",
    ["scripts/ci/affected-apps.mjs", "--base", range.base, "--head", range.head],
    { cwd: range.dir, encoding: "utf8" },
  );
  return JSON.parse(stdout);
}

/**
 * Count the changed files of a range.
 *
 * @param {{ dir: string, base: string, head: string }} range The scratch range.
 * @returns {number} The number of changed files.
 */
function changedFiles(range) {
  const stdout = execFileSync("git", ["diff", "--name-only", range.base, range.head], {
    cwd: range.dir,
    encoding: "utf8",
  });
  return stdout.split("\n").filter((line) => line !== "").length;
}

/**
 * Read the label of one matrix field value.
 *
 * @param {{ id: string } | string} entry The matrix entry.
 * @returns {string} The label.
 */
function labelOf(entry) {
  return typeof entry === "string" ? entry : entry.id;
}

/**
 * Parse the `matrix` output of a select run into app ids.
 *
 * @param {{ outputs: Record<string, string> }} result The select result.
 * @param {string} label The label of the check.
 * @returns {string[]} The app ids.
 */
function matrixIds(result, label) {
  const raw = result.outputs.matrix;
  must(raw !== undefined, `${label} has no matrix output`);
  const parsed = JSON.parse(raw);
  must(Array.isArray(parsed), `${label} matrix is not an array`);
  return parsed.map(labelOf);
}

/**
 * Assert that one select run made no gcloud call and exited 0.
 *
 * @param {string} label The workflow of the check.
 * @param {{ status: number | null, stderr: string, gcloudCalls: string[] }} result The run.
 * @returns {void}
 */
function assertCleanRun(label, result) {
  must(result.status === 0, `${label} status=${result.status} stderr=${result.stderr.trim()}`);
  must(
    result.gcloudCalls.length === 0,
    `${label} gcloud_calls=${result.gcloudCalls.length} calls=${JSON.stringify(result.gcloudCalls)}`,
  );
}

afterAll(() => {
  try {
    must(LINES.length === 11, `dry_run_rows=${LINES.length} expected=11`);
    console.log(`DRYRUN rows_total=${LINES.length} dry_run_rows=${LINES.length}`);
  } finally {
    removeScratchDirs();
    removePlanScratch();
  }
});

describe("Phase 4 dry run of the three workflows on fake ranges", () => {
  it("DR-00 the app table holds 10 rows before the loop", () => {
    requireNonEmpty(TABLE, "scripts/ci/apps.json");
    must(TABLE.length === 10, `table_rows=${TABLE.length} expected=10`);
    must(SELECT_SECRET_REFS === 0, `select_secret_refs=${SELECT_SECRET_REFS} expected=0`);
    console.log(`DRYRUN row=guard table_rows=${TABLE.length} select_secret_refs=${SELECT_SECRET_REFS}`);
  });

  for (const [index, row] of TABLE.entries()) {
    const id = String(row.id);
    const mode = String(row.mode);
    const path = String(row.path);
    const caseId = `DR-${String(index + 1).padStart(2, "0")}`;
    it(`${caseId} the ${id} row runs with no secret and no gcloud call`, () => {
      const range = planRepo({ write: { [`${path}/dry-run.txt`]: `dry run ${id}\n` } });
      const ids = scriptIds(range);
      requireNonEmpty(ids, `${caseId} script ids`);
      must(
        JSON.stringify(ids) === JSON.stringify([id]),
        `${caseId} script ids=${JSON.stringify(ids)} expected=${JSON.stringify([id])}`,
      );

      const www = runSelect(WWW, range.dir, range.base, range.head);
      const apps = runSelect(APPS, range.dir, range.base, range.head);
      const ci = runSelect(CI, range.dir, range.base, range.head);
      ciRanges += 1;

      const cdApps = matrixIds(apps, `${caseId} cd-apps`);
      const ciIds = matrixIds(ci, `${caseId} ci`);
      const cdWww = www.outputs.www ?? "missing";
      const expectedWww = mode === "direct" ? "yes" : "no";
      const expectedApps = mode === "gated" ? [id] : [];
      const gcloudCalls = www.gcloudCalls.length + apps.gcloudCalls.length + ci.gcloudCalls.length;

      const line =
        `DRYRUN row=${id} mode=${mode} range=${path}/dry-run.txt ` +
        `cd_www=${cdWww} cd_apps=${JSON.stringify(cdApps)} ci=${JSON.stringify(ciIds)} ` +
        `gcloud_calls=${gcloudCalls} select_secret_refs=${SELECT_SECRET_REFS}`;
      LINES.push(line);
      console.log(line);

      assertCleanRun(`${caseId} ${WWW}`, www);
      assertCleanRun(`${caseId} ${APPS}`, apps);
      assertCleanRun(`${caseId} ${CI}`, ci);
      must(SELECT_SECRET_REFS === 0, `${caseId} select_secret_refs=${SELECT_SECRET_REFS} expected=0`);
      must(
        cdWww === expectedWww,
        `${caseId} ${id} cd_www=${cdWww} expected=${expectedWww} mode=${mode}`,
      );
      must(
        JSON.stringify(cdApps) === JSON.stringify(expectedApps),
        `${caseId} ${id} cd_apps=${JSON.stringify(cdApps)} expected=${JSON.stringify(expectedApps)}`,
      );
      must(
        JSON.stringify(ciIds) === JSON.stringify([id]),
        `${caseId} ${id} ci=${JSON.stringify(ciIds)} expected=${JSON.stringify([id])}`,
      );
    });
  }

  it("DR-11 the CI row runs on a docs and measure range with empty matrices", () => {
    const range = planRepo({
      write: { "docs/a.md": "# a\n", "measure/b.md": "# b\n" },
    });
    const changed = changedFiles(range);
    must(changed >= 1, `changed_files=${changed} expected>=1`);

    const www = runSelect(WWW, range.dir, range.base, range.head);
    const apps = runSelect(APPS, range.dir, range.base, range.head);
    const ci = runSelect(CI, range.dir, range.base, range.head);
    ciRanges += 1;

    const cdApps = matrixIds(apps, "DR-11 cd-apps");
    const ciIds = matrixIds(ci, "DR-11 ci");
    const cdWww = www.outputs.www ?? "missing";
    const gcloudCalls = www.gcloudCalls.length + apps.gcloudCalls.length + ci.gcloudCalls.length;

    const line =
      `DRYRUN row=ci mode=ci range=docs/a.md,measure/b.md changed_files=${changed} ` +
      `cd_www=${cdWww} cd_apps=${JSON.stringify(cdApps)} ci=${JSON.stringify(ciIds)} ` +
      `gcloud_calls=${gcloudCalls} select_secret_refs=${SELECT_SECRET_REFS} ci_ranges=${ciRanges}`;
    LINES.push(line);
    console.log(line);

    assertCleanRun(`DR-11 ${WWW}`, www);
    assertCleanRun(`DR-11 ${APPS}`, apps);
    assertCleanRun(`DR-11 ${CI}`, ci);
    must(SELECT_SECRET_REFS === 0, `DR-11 select_secret_refs=${SELECT_SECRET_REFS} expected=0`);
    must(cdWww === "no", `DR-11 cd_www=${cdWww} expected=no`);
    must(cdApps.length === 0, `DR-11 cd_apps=${JSON.stringify(cdApps)} expected=[]`);
    must(ciIds.length === 0, `DR-11 ci=${JSON.stringify(ciIds)} expected=[]`);
    must(ciRanges === 11, `DR-11 ci_ranges=${ciRanges} expected=11`);
  });

  it("DR-12 a sales-advantage and workbooks range plans no gated job and logs both skips", () => {
    const range = planRepo({
      write: {
        "apps/sales-advantage/src/dry-run-skip.ts": "export const sales = 1;\n",
        "apps/workbooks/src/dry-run-skip.ts": "export const workbooks = 1;\n",
      },
    });
    const apps = runSelect(APPS, range.dir, range.base, range.head);
    const cdApps = matrixIds(apps, "DR-12 cd-apps");
    const cdWww = apps.outputs.www ?? "missing";
    console.log(
      `DRYRUN row=sales-advantage,workbooks range=apps/sales-advantage,apps/workbooks ` +
        `cd_www=${cdWww} cd_apps=${JSON.stringify(cdApps)} gcloud_calls=${apps.gcloudCalls.length}`,
    );
    assertCleanRun(`DR-12 ${APPS}`, apps);
    must(JSON.stringify(cdApps) === "[]", `DR-12 cd_apps=${JSON.stringify(cdApps)} expected=[]`);
    must(cdWww === "no", `DR-12 cd_www=${cdWww} expected=no`);
    must(
      apps.stderr.includes(
        "skip=sales-advantage reason=release by the traffic runbook only, because it needs release inputs that a push cannot give",
      ),
      `DR-12 sales skip line missing: ${apps.stderr.trim()}`,
    );
    must(
      apps.stderr.includes("skip=workbooks reason=no Cloud Run service exists"),
      `DR-12 workbooks skip line missing: ${apps.stderr.trim()}`,
    );
  });
});
