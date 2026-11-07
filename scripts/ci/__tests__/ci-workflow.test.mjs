#!/usr/bin/env node
/**
 * Red tests for Phase 3 of the track `per_app_cicd_20261107`.
 *
 * The cases are CI-01 to CI-06 of the P3 outline of `test-strategy.md` section 3.
 * They read `.github/workflows/ci.yml` and run its `select` step on a scratch git
 * repository. They never start a workflow and never call `gcloud`.
 *
 * Contract of the `ci.yml` change of task 3.2 (the text this file pins):
 *
 * 1. `ci.yml` holds a job with a step `id: select`.
 * 2. The select step binds the two event SHAs and calls the real script:
 *    `node scripts/ci/affected-apps.mjs --base "$BASE_SHA" --head "$HEAD_SHA"`.
 * 3. The select step writes `matrix=<JSON array>` to `$GITHUB_OUTPUT`. Each entry is
 *    an object with a string `id`; the ids are exactly the script output for the range.
 * 4. A job with `needs: select` reads `${{ fromJSON(needs.select.outputs.matrix) }}`,
 *    is gated on the matrix, and runs `turbo run … --filter=${{ matrix.id }}...`.
 * 5. The repository-wide guard steps stay in a job that the select output does not gate,
 *    and the pull request path triggers stay.
 *
 * At the base `ci.yml` holds no select step and no `--filter=` run, so CI-01 to CI-04
 * fail with `missing select step in .github/workflows/ci.yml`. CI-05 is a
 * characterization case: the guards exist at the base and pass. CI-06 fails at the base
 * because zero ranges were compared.
 *
 * Run with the Red command of test-strategy section P1.3.
 *
 * @module ci-workflow.test
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, it } from "vitest";
import {
  ROOT,
  changedFileCount,
  commitChanges,
  makeRepo,
  removeScratchDirs,
  runScript,
  syntheticWorkspace,
} from "./helpers/scratch.mjs";
import {
  allSteps,
  planRepo,
  readText,
  removePlanScratch,
  runSelect,
  selectStep,
  workflow,
} from "./helpers/plan.mjs";

afterAll(() => {
  removeScratchDirs();
  removePlanScratch();
});

/**
 * The repository-wide guards that the CI change must keep.
 *
 * These steps are not app tests. They check the architecture, the configuration, and
 * the types of the whole repository. Task 3.2 must not move them behind the app plan.
 */
const GUARD_STEPS = [
  "Config drift check",
  "Architecture archive evidence compatibility",
  "Architecture boundary check",
  "Tenant and provider architecture guards",
  "Lint",
  "Type check",
];

/**
 * The pull request path triggers that the CI change must keep.
 *
 * A coarse path filter is a pre-filter, not the app decision. The repository-wide
 * guards run when one of these paths changes.
 */
const REQUIRED_PR_PATHS = [
  "apps/**",
  "packages/**",
  "services/**",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
];

/** The apps of the workspace that are not rows of the app table. */
const UNTESTED_APPS = ["activity-vinext-fixture", "advantage-games", "science-advantage"];

/** The rows that depend on `packages/utils` through the workspace graph. */
const UTILS_ROWS = [
  "accounting",
  "codecamp-advantage",
  "marketing",
  "primary-advantage",
  "reading-advantage",
  "sales-advantage",
  "www-reading-advantage",
];

/** The number of ranges that the tests compared without a failure. */
let rangesCompared = 0;

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
 * Sort a list of ids.
 *
 * @param {string[]} ids The ids.
 * @returns {string[]} The sorted ids.
 */
function sortedIds(ids) {
  return [...ids].sort();
}

/**
 * Read the app ids that the real script returns for a range.
 *
 * @param {{ dir: string, base: string, head: string }} range The scratch range.
 * @param {string} label The label of the check.
 * @returns {string[]} The sorted ids.
 */
function scriptIds(range, label) {
  const result = runScript(range.dir, range.base, range.head);
  must(
    result.status === 0,
    `${label}: script exit=${result.status} stderr=${result.stderr.trim()}`,
  );
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label}: script stdout is not JSON: ${JSON.stringify(result.stdout)}`);
  }
  must(Array.isArray(parsed), `${label}: script stdout is not an array`);
  return sortedIds(parsed);
}

/**
 * Read the app ids that the `ci.yml` select step plans for a range.
 *
 * @param {{ dir: string, base: string, head: string }} range The scratch range.
 * @param {string} label The label of the check.
 * @returns {string[]} The sorted ids.
 */
function ciPlan(range, label) {
  const result = runSelect("ci.yml", range.dir, range.base, range.head);
  must(
    result.status === 0,
    `${label}: ci.yml select exit=${result.status} stderr=${result.stderr.trim()}`,
  );
  must(
    Object.prototype.hasOwnProperty.call(result.outputs, "matrix"),
    `${label}: ci.yml select wrote no matrix output; outputs=${Object.keys(result.outputs).join(",")}`,
  );
  let matrix;
  try {
    matrix = JSON.parse(result.outputs.matrix);
  } catch {
    throw new Error(`${label}: matrix is not JSON: ${JSON.stringify(result.outputs.matrix)}`);
  }
  must(Array.isArray(matrix), `${label}: matrix is not an array`);
  const ids = matrix.map((entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry) ? entry.id : undefined,
  );
  must(
    ids.every((id) => typeof id === "string" && id !== ""),
    `${label}: a matrix entry holds no string id; matrix=${JSON.stringify(matrix)}`,
  );
  must(result.gcloudCalls.length === 0, `${label}: gcloud_calls=${result.gcloudCalls.length}`);
  return sortedIds(ids);
}

/**
 * Compare the script output and the `ci.yml` plan for one range.
 *
 * The changed-file count is asserted before an empty list is accepted (A4). The script
 * output is compared to the P1 expected set when the caller names one, so the range is
 * proven real and not empty on both sides.
 *
 * @param {{ dir: string, base: string, head: string }} range The scratch range.
 * @param {string} label The label of the check.
 * @param {string[] | null} expected The expected ids, or null to skip the P1 check.
 * @returns {void}
 */
function compareRange(range, label, expected) {
  const changed = changedFileCount(range.dir, range.base, range.head);
  must(changed >= 1, `${label}: changed_files=${changed}`);
  const actual = scriptIds(range, label);
  if (expected !== null) {
    const wanted = sortedIds(expected);
    must(
      JSON.stringify(actual) === JSON.stringify(wanted),
      `${label}: script ids=${JSON.stringify(actual)} expected=${JSON.stringify(wanted)} changed_files=${changed}`,
    );
  }
  const planned = ciPlan(range, label);
  must(
    JSON.stringify(planned) === JSON.stringify(actual),
    `${label}: ci plan=${JSON.stringify(planned)} script=${JSON.stringify(actual)} changed_files=${changed}`,
  );
  rangesCompared += 1;
}

/**
 * Assert that the repository-wide guards and their path triggers stay.
 *
 * The guard list is asserted to be non-empty first (A4). Each guard step must sit in a
 * job that the select output does not gate.
 *
 * @returns {number} The number of guard steps that were checked.
 */
function assertGuards() {
  must(GUARD_STEPS.length >= 1, `guards_expected=${GUARD_STEPS.length}`);
  const doc = workflow("ci.yml");
  const guards = [];
  for (const { job, step } of allSteps(doc)) {
    if (GUARD_STEPS.includes(String(step.name ?? ""))) {
      guards.push({ job, name: String(step.name) });
    }
  }
  const found = new Set(guards.map((entry) => entry.name));
  const missing = GUARD_STEPS.filter((name) => !found.has(name));
  must(
    missing.length === 0,
    `guards_found=${found.size} guards_expected=${GUARD_STEPS.length}; missing=${missing.join(",")}`,
  );
  for (const guard of guards) {
    const job = doc.jobs?.[guard.job];
    must(
      !String(job?.if ?? "").includes("needs.select"),
      `${guard.name} is gated on the select output`,
    );
  }
  const paths = (doc.on?.pull_request?.paths ?? []).map(String);
  must(paths.length >= 1, `pull_request_paths=${paths.length}`);
  const missingPaths = REQUIRED_PR_PATHS.filter((path) => !paths.includes(path));
  must(
    missingPaths.length === 0,
    `missing path triggers: ${missingPaths.join(",")} pull_request_paths=${paths.length}`,
  );
  return found.size;
}

describe("CI: the affected-app plan of ci.yml", () => {
  it("CI-01a a www-only range plans exactly the script ids", () => {
    const range = planRepo({
      write: { "apps/www-reading-advantage/src/app/page.tsx": "export default 1;\n" },
    });
    compareRange(range, "CI-01a www-only", ["www-reading-advantage"]);
  });

  it("CI-01b a storytime-only range plans exactly the script ids", () => {
    const range = planRepo({
      write: { "apps/storytime/app/page.tsx": "export default 1;\n" },
    });
    compareRange(range, "CI-01b storytime-only", ["storytime"]);
  });

  it("CI-01c a read-along change plans exactly the script ids", () => {
    const range = planRepo({
      write: { "packages/read-along/src/index.ts": "export const readAlong = false;\n" },
    });
    compareRange(range, "CI-01c read-along", ["storytime"]);
  });

  it("CI-01d a packages/utils change plans the 7 graph rows", () => {
    const range = planRepo({
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    compareRange(range, "CI-01d utils", UTILS_ROWS);
  });

  it("CI-01e a primary-only range plans exactly the script ids", () => {
    const range = planRepo({
      write: { "apps/primary-advantage/lib/red-p3-probe.ts": "export const probe = 1;\n" },
    });
    compareRange(range, "CI-01e primary-only", ["primary-advantage"]);
  });

  it("CI-01f an accounts and workbooks range plans exactly the script ids", () => {
    const range = planRepo({
      write: {
        "apps/accounts/src/red-p3-probe.ts": "export const probe = 1;\n",
        "apps/workbooks/src/red-p3-probe.ts": "export const probe = 1;\n",
      },
    });
    compareRange(range, "CI-01f accounts+workbooks", ["accounts", "workbooks"]);
  });

  it("CI-01g a lockfile entry of one app plans exactly the script ids", () => {
    const script = readText("scripts/ci/affected-apps.mjs");
    const files = { ...syntheticWorkspace(), "scripts/ci/affected-apps.mjs": script };
    const { dir, sha: base } = makeRepo(files);
    let lock = files["pnpm-lock.yaml"];
    lock = lock.replace("        version: 5.3.0\n", "        version: 5.3.1\n");
    lock = lock.replace("  chalk@5.3.0:\n", "  chalk@5.3.1:\n");
    lock = lock.replace(
      "  chalk@5.3.0(ansi-styles@6.2.1):\n",
      "  chalk@5.3.1(ansi-styles@6.2.1):\n",
    );
    must(lock !== files["pnpm-lock.yaml"], "the lockfile fixture text is missing");
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    compareRange({ dir, base, head }, "CI-01g lockfile", ["alpha"]);
  });

  it("CI-02 a docs-only range plans no app job and keeps the guards", () => {
    const range = planRepo({
      write: {
        "docs/red-p3.md": "# p3\n",
        "measure/runs/red-p3.md": "# p3\n",
        ".github/workflows/ci.yml": "name: CI\n",
      },
    });
    const changed = changedFileCount(range.dir, range.base, range.head);
    must(changed >= 1, `CI-02 docs-only: changed_files=${changed}`);
    const guards = assertGuards();
    must(guards === GUARD_STEPS.length, `guards_found=${guards} changed_files=${changed}`);
    const actual = scriptIds(range, "CI-02 docs-only");
    must(
      actual.length === 0,
      `CI-02 docs-only: script ids=${JSON.stringify(actual)} expected=[] changed_files=${changed}`,
    );
    const planned = ciPlan(range, "CI-02 docs-only");
    must(
      planned.length === 0,
      `CI-02 docs-only: ci plan=${JSON.stringify(planned)} expected=[] changed_files=${changed} guards_checked=${guards}`,
    );
    rangesCompared += 1;
  });

  it("CI-03 the three non-table apps plan no app job", () => {
    must(UNTESTED_APPS.length === 3, `untested_apps=${UNTESTED_APPS.length}`);
    for (const id of UNTESTED_APPS) {
      must(
        existsSync(join(ROOT, "apps", id, "package.json")),
        `the app ${id} has no package.json; untested_apps=${UNTESTED_APPS.length}`,
      );
    }
    for (const id of UNTESTED_APPS) {
      const range = planRepo({
        write: { [`apps/${id}/src/red-p3-probe.ts`]: "export const probe = 1;\n" },
      });
      const changed = changedFileCount(range.dir, range.base, range.head);
      must(changed >= 1, `CI-03 ${id}: changed_files=${changed}`);
      const actual = scriptIds(range, `CI-03 ${id}`);
      must(
        actual.length === 0,
        `CI-03 ${id}: script ids=${JSON.stringify(actual)} expected=[] untested_apps=${UNTESTED_APPS.length}`,
      );
      const planned = ciPlan(range, `CI-03 ${id}`);
      must(
        planned.length === 0,
        `CI-03 ${id}: ci plan=${JSON.stringify(planned)} expected=[] untested_apps=${UNTESTED_APPS.length} changed_files=${changed}`,
      );
      rangesCompared += 1;
    }
  });

  it("CI-04 the affected-app job uses turbo --filter with the matrix id", () => {
    const doc = workflow("ci.yml");
    const select = selectStep(doc, "ci.yml");
    const selectRun = String(select.run ?? "");
    must(
      selectRun.includes("scripts/ci/affected-apps.mjs"),
      "the ci.yml select step does not call the script",
    );
    must(
      selectRun.includes("--base") && selectRun.includes("--head"),
      "the ci.yml select step holds no --base and --head",
    );
    let appJob = null;
    for (const [name, job] of Object.entries(doc.jobs ?? {})) {
      const needs = Array.isArray(job?.needs) ? job.needs : [job?.needs].filter(Boolean);
      if (!needs.includes("select")) continue;
      const include = String(job?.strategy?.matrix?.include ?? "");
      if (!include.includes("needs.select.outputs.matrix")) continue;
      appJob = { name, job };
      break;
    }
    must(
      appJob,
      "no ci.yml job has needs: select and fromJSON(needs.select.outputs.matrix)",
    );
    const run = (appJob.job.steps ?? []).map((step) => String(step.run ?? "")).join("\n");
    must(/turbo\s+run/.test(run), `job ${appJob.name} runs no turbo run`);
    const filters = [...run.matchAll(/--filter=/g)];
    must(filters.length >= 1, `filters_checked=${filters.length}`);
    const matrixFilters = [
      ...run.matchAll(/--filter=["']?\$\{\{\s*matrix\.id\s*\}\}\.\.\.["']?/g),
    ];
    must(
      matrixFilters.length === filters.length,
      `filters_checked=${filters.length} matrix_id_filters=${matrixFilters.length}`,
    );
  });

  it("CI-05 the repository-wide guards still run (characterization; passes at the base)", () => {
    const guards = assertGuards();
    must(guards === GUARD_STEPS.length, `guards_found=${guards}`);
    must(
      REQUIRED_PR_PATHS.length >= 1,
      `pull_request_paths_expected=${REQUIRED_PR_PATHS.length}`,
    );
  });

  it("CI-06 the plan was compared for at least 6 ranges", () => {
    must(rangesCompared >= 6, `ranges_checked=${rangesCompared}`);
  });
});
