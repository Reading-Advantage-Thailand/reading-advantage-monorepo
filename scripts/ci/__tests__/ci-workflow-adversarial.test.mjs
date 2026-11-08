#!/usr/bin/env node
/**
 * Adversarial tests for Phase 3 of the track `per_app_cicd_20261107`.
 *
 * The attacks that the CI cases do not pin:
 *
 * - The select step takes the two event SHAs from its env map, never from run
 *   text. A `${{` in run text is a GitHub interpolation that the local runner
 *   cannot see, and it turns the range into text that bash cannot parse.
 * - The affected job stays gated: it runs only when the select output holds at
 *   least one id, and the step-to-job output wiring stays intact.
 * - The select step fails closed when the range cannot be resolved. A fallback
 *   that hides the failure plans no app job and reports success.
 *
 * Every dry-run case runs the real select step of `ci.yml` on a scratch git
 * repository. No workflow runs and no `gcloud` call happens.
 *
 * @module ci-workflow-adversarial.test
 */
import { afterAll, describe, it } from "vitest";
import { changedFileCount, removeScratchDirs, setOriginMaster } from "./helpers/scratch.mjs";
import {
  planRepo,
  removePlanScratch,
  runSelect,
  selectStep,
  workflow,
} from "./helpers/plan.mjs";

/** The base that GitHub sends for a new branch: 40 zeros. */
const ZERO_BASE = "0".repeat(40);

/** The exact env binding of the base of the select step. */
const BASE_ENV = "${{ github.event.before || github.event.pull_request.base.sha }}";

/** The exact env binding of the head of the select step. */
const HEAD_ENV = "${{ github.sha }}";

/** The exact step-to-job output wiring of the select job. */
const MATRIX_OUTPUT = "${{ steps.select.outputs.matrix }}";

/** The exact matrix source of the affected job. */
const MATRIX_INCLUDE = "${{ fromJSON(needs.select.outputs.matrix) }}";

/** The exact gate of the affected job. */
const MATRIX_GATE = "needs.select.outputs.matrix != '[]'";

afterAll(() => {
  removeScratchDirs();
  removePlanScratch();
});

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
 * Find the job that consumes the select output as its matrix.
 *
 * @param {Record<string, unknown>} doc The parsed workflow.
 * @returns {{ name: string, job: Record<string, unknown> } | null} The job, or null.
 */
function matrixJob(doc) {
  for (const [name, job] of Object.entries(doc.jobs ?? {})) {
    const needs = Array.isArray(job?.needs) ? job.needs : [job?.needs].filter(Boolean);
    if (!needs.includes("select")) continue;
    if (String(job?.strategy?.matrix?.include ?? "") === MATRIX_INCLUDE) return { name, job };
  }
  return null;
}

describe("A: per-app CI adversarial", () => {
  it("A-P3-01 the select step binds the event SHAs through env, not run text", () => {
    const doc = workflow("ci.yml");
    const selectJob = doc.jobs?.select;
    must(selectJob, "ci.yml holds no select job");
    must(
      String(selectJob.if ?? "") === "",
      `the select job is gated and skips one event: if=${JSON.stringify(selectJob.if)}`,
    );
    const select = selectStep(doc, "ci.yml");
    must(
      String(select.env?.BASE_SHA ?? "") === BASE_ENV,
      `BASE_SHA=${JSON.stringify(select.env?.BASE_SHA)} expected=${JSON.stringify(BASE_ENV)}`,
    );
    must(
      String(select.env?.HEAD_SHA ?? "") === HEAD_ENV,
      `HEAD_SHA=${JSON.stringify(select.env?.HEAD_SHA)} expected=${JSON.stringify(HEAD_ENV)}`,
    );
    const runText = String(select.run ?? "");
    must(
      runText.includes('--base "$BASE_SHA"') && runText.includes('--head "$HEAD_SHA"'),
      `the select run reads no "$BASE_SHA" and "$HEAD_SHA": ${JSON.stringify(runText)}`,
    );
    for (const step of selectJob.steps ?? []) {
      const text = String(step.run ?? "");
      must(
        !text.includes("${{"),
        "a select job step holds a ${{ in run text: " +
          JSON.stringify(String(step.name ?? step.id ?? "")),
      );
    }
    const checkouts = (selectJob.steps ?? []).filter((step) =>
      String(step.uses ?? "").startsWith("actions/checkout"),
    );
    must(checkouts.length >= 1, `select_job_checkouts=${checkouts.length}`);
    const depths = checkouts.map((step) => step.with?.["fetch-depth"]);
    must(
      depths.every((depth) => depth === 0),
      `select_job_fetch_depths=${JSON.stringify(depths)}`,
    );
  });

  it("A-P3-02 the affected job runs only for a non-empty matrix", () => {
    const doc = workflow("ci.yml");
    const selectJob = doc.jobs?.select;
    must(selectJob, "ci.yml holds no select job");
    must(
      String(selectJob.outputs?.matrix ?? "") === MATRIX_OUTPUT,
      `select outputs.matrix=${JSON.stringify(selectJob.outputs?.matrix)} expected=${JSON.stringify(MATRIX_OUTPUT)}`,
    );
    const found = matrixJob(doc);
    must(found, "no ci.yml job reads fromJSON(needs.select.outputs.matrix)");
    must(
      String(found.job.if ?? "") === MATRIX_GATE,
      `job ${found.name} if=${JSON.stringify(found.job.if)} expected=${JSON.stringify(MATRIX_GATE)}`,
    );
  });

  it("A-P3-03 a zero base without origin/master fails the select step closed", () => {
    const range = planRepo({
      write: { "apps/storytime/app/adversarial-probe.ts": "export const x = 1;\n" },
    });
    const changed = changedFileCount(range.dir, range.base, range.head);
    must(changed >= 1, `changed_files=${changed}`);
    const result = runSelect("ci.yml", range.dir, ZERO_BASE, range.head);
    must(
      result.status === 2,
      `expected exit 2, got ${result.status}; stderr=${result.stderr.trim()}`,
    );
    must(
      Object.keys(result.outputs).length === 0,
      `outputs=${JSON.stringify(result.outputs)}`,
    );
    must(result.gcloudCalls.length === 0, `gcloud_calls=${result.gcloudCalls.length}`);
  });

  it("A-P3-04 a zero base with origin/master plans the script ids", () => {
    const range = planRepo({
      write: { "apps/storytime/app/adversarial-probe.ts": "export const x = 1;\n" },
    });
    setOriginMaster(range.dir, range.base);
    const changed = changedFileCount(range.dir, range.base, range.head);
    must(changed >= 1, `changed_files=${changed}`);
    const result = runSelect("ci.yml", range.dir, ZERO_BASE, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(
      Object.prototype.hasOwnProperty.call(result.outputs, "matrix"),
      `the select step wrote no matrix output; outputs=${Object.keys(result.outputs).join(",")}`,
    );
    const matrix = JSON.parse(result.outputs.matrix ?? "null");
    must(
      Array.isArray(matrix) && matrix.length === 1,
      `jobs_planned=${matrix?.length} changed_files=${changed}`,
    );
    must(
      matrix[0] && typeof matrix[0] === "object" && matrix[0].id === "storytime",
      `id=${JSON.stringify(matrix[0]?.id)}`,
    );
    must(result.gcloudCalls.length === 0, `gcloud_calls=${result.gcloudCalls.length}`);
  });
});
