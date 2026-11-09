#!/usr/bin/env node
/**
 * Adversarial tests for Phase 2 of the track `per_app_cicd_20261107`.
 *
 * The attacks of test-strategy section P2.7 that the W and F cases do not
 * cover: a fork pull request, a zero base with and without `origin/master`,
 * a force-pushed base, a traffic token in raw workflow text, and the
 * release-commit provenance of the gated matrix. Every dry-run case runs the
 * real select step on a scratch git repository.
 *
 * @module cd-workflows-adversarial.test
 */
import { afterAll, describe, it } from "vitest";
import {
  changedFileCount,
  commitChanges,
  git,
  makeRepo,
  removeScratchDirs,
  setOriginMaster,
} from "./helpers/scratch.mjs";
import {
  allWorkflowFiles,
  gatedRows,
  readText,
  realPlanFiles,
  removePlanScratch,
  runSelect,
  selectStep,
  workflow,
} from "./helpers/plan.mjs";

const WWW = "cd-www-reading-advantage.yml";
const APPS = "cd-apps.yml";

/** The base that GitHub sends for a new branch: 40 zeros. */
const ZERO_BASE = "0".repeat(40);

/** The traffic tokens that no workflow file may hold in raw text. */
const TRAFFIC_TOKENS = ["update-traffic", "--to-latest", "cloudbuild-traffic"];

/** The release default line of the marketing push file. */
const MARKETING_DEFAULT = '  _RELEASE_COMMIT_SHA: "REQUIRED_RELEASE_COMMIT_SHA"';

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
 * Assert that a select-step run refused a range and planned nothing.
 *
 * @param {{ status: number | null, outputs: Record<string, string>, gcloudCalls: string[], stderr: string }} result The result of the run.
 * @param {string} label The label of the check.
 * @returns {void}
 */
function mustFailClosed(result, label) {
  must(
    result.status === 2,
    `${label}: expected exit 2, got ${result.status}; stderr=${result.stderr.trim()}`,
  );
  must(
    Object.keys(result.outputs).length === 0,
    `${label}: outputs=${JSON.stringify(result.outputs)}`,
  );
  must(result.gcloudCalls.length === 0, `${label}: gcloud_calls=${result.gcloudCalls.length}`);
}

/**
 * Build a scratch plan repository that holds extra base files.
 *
 * @param {Record<string, string>} files The extra files of the base commit.
 * @returns {{ dir: string, base: string }} The repository and its base commit.
 */
function planRepoWith(files) {
  const { dir, sha } = makeRepo({ ...realPlanFiles(), ...files });
  return { dir, base: sha };
}

/**
 * Run the APPS select step on a marketing-only change.
 *
 * @param {string} marketingText The marketing push file text of the base commit.
 * @returns {{ head: string, matrix: Record<string, unknown>[], result: { status: number | null, stderr: string, outputs: Record<string, string>, gcloudCalls: string[] } }} The head commit, the planned matrix, and the run result.
 */
function marketingRun(marketingText) {
  const { dir, base } = planRepoWith({ "apps/marketing/cloudbuild.yaml": marketingText });
  const head = commitChanges(dir, {
    write: { "apps/marketing/src/adversarial-probe.ts": "export const x = 1;\n" },
  });
  const result = runSelect(APPS, dir, base, head);
  return { head, matrix: JSON.parse(result.outputs.matrix ?? "null"), result };
}

describe("A: per-app CD adversarial", () => {
  it("A-P2-01 a fork pull request cannot start a CD workflow", () => {
    for (const name of [WWW, APPS]) {
      const doc = workflow(name);
      const keys = Object.keys(doc.on ?? {});
      must(
        JSON.stringify(keys) === JSON.stringify(["push"]),
        `${name} on_keys=${keys.join(",")}`,
      );
      const branches = doc.on?.push?.branches ?? [];
      must(
        JSON.stringify(branches) === JSON.stringify(["master"]),
        `${name} branches=${JSON.stringify(branches)}`,
      );
    }
  });

  it("A-P2-02 a zero base falls back to origin/master", () => {
    const { dir, base } = planRepoWith({});
    const head = commitChanges(dir, {
      write: { "apps/storytime/app/adversarial-probe.ts": "export const x = 1;\n" },
    });
    setOriginMaster(dir, base);
    const changed = changedFileCount(dir, base, head);
    must(changed >= 1, `changed_files=${changed}`);
    const result = runSelect(APPS, dir, ZERO_BASE, head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    const matrix = JSON.parse(result.outputs.matrix ?? "null");
    must(
      Array.isArray(matrix) && matrix.length === 1,
      `jobs_planned=${matrix?.length} changed_files=${changed}`,
    );
    must(matrix[0].id === "storytime", `id=${matrix[0]?.id}`);
    must(result.outputs.www === "no", `www=${result.outputs.www}`);
    must(result.gcloudCalls.length === 0, `gcloud_calls=${result.gcloudCalls.length}`);
  });

  it("A-P2-03 a zero base without origin/master fails closed", () => {
    const { dir, base } = planRepoWith({});
    const head = commitChanges(dir, {
      write: { "apps/storytime/app/adversarial-probe.ts": "export const x = 1;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    must(changed >= 1, `changed_files=${changed}`);
    const result = runSelect(APPS, dir, ZERO_BASE, head);
    mustFailClosed(result, "A-P2-03");
  });

  it("A-P2-04 a base that the clone holds after a force push is readable", () => {
    const { dir, base } = planRepoWith({});
    const pushed = commitChanges(dir, {
      write: { "apps/www-reading-advantage/src/app/page.tsx": "export default 1;\n" },
    });
    const reset = git(dir, ["reset", "-q", "--hard", base]);
    must(reset.status === 0, `reset exit=${reset.status}`);
    const head = commitChanges(dir, {
      write: { "apps/storytime/app/adversarial-probe.ts": "export const x = 1;\n" },
    });
    const held = git(dir, ["cat-file", "-e", `${pushed}^{commit}`]);
    must(held.status === 0, "the clone does not hold the pushed base");
    const changed = changedFileCount(dir, pushed, head);
    must(changed === 2, `changed_files=${changed}`);
    const result = runSelect(APPS, dir, pushed, head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    const matrix = JSON.parse(result.outputs.matrix ?? "null");
    must(Array.isArray(matrix) && matrix.length === 1, `jobs_planned=${matrix?.length}`);
    must(matrix[0].id === "storytime", `id=${matrix[0]?.id}`);
    must(result.outputs.www === "yes", `www=${result.outputs.www}`);
    must(result.gcloudCalls.length === 0, `gcloud_calls=${result.gcloudCalls.length}`);
  });

  it("A-P2-05 a base that the clone lacks after a force push fails closed", () => {
    const { dir, base } = planRepoWith({});
    const pushed = commitChanges(dir, {
      write: { "apps/www-reading-advantage/src/app/page.tsx": "export default 1;\n" },
    });
    const reset = git(dir, ["reset", "-q", "--hard", base]);
    must(reset.status === 0, `reset exit=${reset.status}`);
    const head = commitChanges(dir, {
      write: { "apps/storytime/app/adversarial-probe.ts": "export const x = 1;\n" },
    });
    git(dir, ["reflog", "expire", "--expire=now", "--all"]);
    const gc = git(dir, ["gc", "--prune=now", "--quiet"]);
    must(gc.status === 0, `gc exit=${gc.status}`);
    const held = git(dir, ["cat-file", "-e", `${pushed}^{commit}`]);
    must(held.status !== 0, "the pruned base is still held");
    const result = runSelect(APPS, dir, pushed, head);
    mustFailClosed(result, "A-P2-05");
  });

  it("A-P2-06 no workflow file moves traffic in raw text", () => {
    const files = allWorkflowFiles();
    must(files.length >= 3, `workflow_files=${files.length}`);
    const hits = [];
    for (const name of files) {
      const text = readText(`.github/workflows/${name}`);
      for (const token of TRAFFIC_TOKENS) {
        if (text.includes(token)) hits.push(`${name}:${token}`);
      }
    }
    must(hits.length === 0, `raw_traffic_hits=${hits.length} ${hits.join(",")}`);
  });

  it("A-P2-07 the raw scan keeps hits that comments or denials hide", () => {
    const base = readText(`.github/workflows/${APPS}`);
    const clean = TRAFFIC_TOKENS.filter((token) => base.includes(token));
    must(clean.length === 0, `clean_tree_hits=${clean.join(",")}`);
    const probes = [
      "# a comment: never run update-traffic from this workflow\n",
      "        run: echo we do not pass --to-latest here\n",
      "        # cloudbuild-traffic runs by hand only\n",
    ];
    must(probes.length === 3, `probes=${probes.length}`);
    for (const probe of probes) {
      const text = base + probe;
      const found = TRAFFIC_TOKENS.filter((token) => text.includes(token));
      must(found.length > 0, `the scan lost the hit of ${JSON.stringify(probe.trim())}`);
    }
  });

  it("A-P2-08 only marketing gets the pushed commit as its release substitution", () => {
    const rows = gatedRows();
    must(rows.length === 6, `gated_rows=${rows.length}`);
    const files = {};
    for (const row of rows) files[String(row.cloudbuild)] = readText(String(row.cloudbuild));
    must(Object.keys(files).length === 6, `push_files=${Object.keys(files).length}`);
    const write = {};
    for (const row of rows) write[`${row.path}/src/adversarial-probe.ts`] = "export const x = 1;\n";
    const { dir, base } = planRepoWith(files);
    const head = commitChanges(dir, { write });
    const changed = changedFileCount(dir, base, head);
    must(changed === 6, `changed_files=${changed}`);
    const result = runSelect(APPS, dir, base, head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    const matrix = JSON.parse(result.outputs.matrix ?? "null");
    must(Array.isArray(matrix) && matrix.length === 6, `jobs_planned=${matrix?.length}`);
    const byId = new Map(matrix.map((entry) => [String(entry.id), entry]));
    let passedTo = 0;
    for (const row of rows) {
      const entry = byId.get(String(row.id));
      must(entry, `${row.id} is missing from the matrix`);
      must(entry.cloudbuild === row.cloudbuild, `${row.id} cloudbuild differs`);
      const expected = row.id === "marketing" ? `--substitutions=_RELEASE_COMMIT_SHA=${head}` : "";
      if (entry.substitutions === expected && expected !== "") passedTo += 1;
      must(
        entry.substitutions === expected,
        `${row.id} substitutions=${JSON.stringify(entry.substitutions)}`,
      );
    }
    must(passedTo === 1, `rows_with_release_commit=${passedTo}`);
    must(result.gcloudCalls.length === 0, `gcloud_calls=${result.gcloudCalls.length}`);
  });

  it("A-P2-09 the release rule keeps its exact trigger shape", () => {
    const real = readText("apps/marketing/cloudbuild.yaml");
    must(real.includes(MARKETING_DEFAULT), "the marketing release default line changed");
    const variants = [
      {
        label: "single-quoted",
        text: real.replace(MARKETING_DEFAULT, "  _RELEASE_COMMIT_SHA: 'REQUIRED_RELEASE_COMMIT_SHA'"),
        expected: "",
      },
      {
        label: "four-space-indent",
        text: real.replace(MARKETING_DEFAULT, '    _RELEASE_COMMIT_SHA: "REQUIRED_RELEASE_COMMIT_SHA"'),
        expected: "",
      },
      {
        label: "hostile-value",
        text: real.replace(
          MARKETING_DEFAULT,
          '  _RELEASE_COMMIT_SHA: "REQUIRED_ $(touch pwned) `id` ${{ github.sha }}"',
        ),
        expected: null,
      },
    ];
    must(variants.length === 3, `variants=${variants.length}`);
    for (const variant of variants) {
      const { head, matrix, result } = marketingRun(variant.text);
      must(
        result.status === 0,
        `${variant.label}: select step failed: ${result.stderr.trim()}`,
      );
      must(
        Array.isArray(matrix) && matrix.length === 1,
        `${variant.label}: jobs_planned=${matrix?.length}`,
      );
      must(matrix[0].id === "marketing", `${variant.label}: id=${matrix[0]?.id}`);
      const wanted = variant.expected ?? `--substitutions=_RELEASE_COMMIT_SHA=${head}`;
      must(
        matrix[0].substitutions === wanted,
        `${variant.label}: substitutions=${JSON.stringify(matrix[0].substitutions)}`,
      );
    }
  });

  it("A-P2-10 the release substitution comes only from the pushed head", () => {
    const pinned = 'return only ? "--substitutions=_RELEASE_COMMIT_SHA=" + process.env.HEAD_SHA : "";';
    for (const name of [WWW, APPS]) {
      const doc = workflow(name);
      const step = selectStep(doc, name);
      const run = String(step.run ?? "");
      must(run.includes(pinned), `${name} does not pin the release substitution to HEAD_SHA`);
      const occurrences = (run.match(/--substitutions=/g) ?? []).length;
      must(occurrences === 1, `${name} substitutions_occurrences=${occurrences}`);
      must(
        String(step.env?.HEAD_SHA ?? "") === "${{ github.sha }}",
        `${name} HEAD_SHA is not the pushed commit`,
      );
    }
    const build = workflow(APPS).jobs?.build;
    must(build, `missing build job in .github/workflows/${APPS}`);
    const submit = (build.steps ?? [])
      .map((step) => String(step.run ?? ""))
      .join("\n");
    const interpolated = (submit.match(/\$\{\{ matrix\.substitutions \}\}/g) ?? []).length;
    must(interpolated === 1, `matrix_substitutions_uses=${interpolated}`);
    must(!/--substitutions=/.test(submit), "the build job writes a substitution of its own");
  });
});
