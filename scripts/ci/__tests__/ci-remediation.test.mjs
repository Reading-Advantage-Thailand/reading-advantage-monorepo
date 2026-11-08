#!/usr/bin/env node
/**
 * Red tests for the review remediation of Phase 3 of `per_app_cicd_20261107`.
 *
 * The cases pin the three findings that the orchestrator routed to a Red pin:
 *
 * - CI-R1 (Review A F1, Blocker): every workspace package of `pnpm-workspace.yaml` that
 *   holds a `test` script is inside the closure of the job filters. The roots are the
 *   `--filter=<x>...` roots of the `Test` step of `.github/workflows/ci.yml` plus every
 *   id of `scripts/ci/apps.json`, each with its workspace dependencies.
 * - CI-R2 (Review B F1, Major): `scripts/ci/affected-apps.mjs` refuses a table id that
 *   is not a safe workspace id. The id must not reach a shell line unquoted.
 * - CI-R3 (Review B F2, Major): `.github/workflows/ci.yml` holds a workflow-level
 *   `permissions` map equal to `contents: read`, and no job widens it.
 *
 * The cases read the real workflow, table, and manifests. CI-R2 runs the real script on
 * a scratch git repository. They are artifact and function-level tests: no workflow runs
 * and no `gcloud` call happens.
 *
 * Run with the Red command of test-strategy section P1.3.
 *
 * @module ci-remediation.test
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { afterAll, describe, it } from "vitest";
import {
  commitChanges,
  expectRefusal,
  makeRepo,
  removeScratchDirs,
  runScript,
  syntheticWorkspace,
  tableText,
} from "./helpers/scratch.mjs";
import {
  FIXTURE_ROOT,
  allSteps,
  planRepo,
  readText,
  removePlanScratch,
  workflow,
} from "./helpers/plan.mjs";

afterAll(() => {
  removeScratchDirs();
  removePlanScratch();
});

/** The lowest number of test-bearing packages that the coverage case accepts. */
const MIN_TEST_PACKAGES = 40;

/** The lowest number of app table rows that the coverage case accepts. */
const MIN_TABLE_ROWS = 10;

/** The shape of a safe workspace id: lower-case letters, digits, and hyphens. */
const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

/** The lowest number of workspace globs that the coverage case accepts. */
const MIN_WORKSPACE_GLOBS = 4;

/** The ids of the fixture table that must be refused. */
const UNSAFE_IDS = ["x;rm -rf /", "--help", "a b"];

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
 * Read the workspace globs from `pnpm-workspace.yaml`.
 *
 * The old CI `Test` step ran the root `turbo run test` over every glob of this list,
 * so the case reads the list and does not hardcode the folders.
 *
 * @returns {string[]} The globs of the `packages` list.
 * @throws {Error} When the list is missing or holds a glob without `/*`.
 */
function workspaceGlobs() {
  const doc = parse(readText("pnpm-workspace.yaml"));
  const globs = doc?.packages;
  must(
    Array.isArray(globs) && globs.length >= MIN_WORKSPACE_GLOBS,
    `workspace_globs=${globs?.length} floor=${MIN_WORKSPACE_GLOBS}`,
  );
  must(
    globs.every((glob) => typeof glob === "string" && glob.endsWith("/*")),
    `workspace_globs=${JSON.stringify(globs)}`,
  );
  return globs.map(String);
}

/**
 * List the workspace package folders under the fixture tree.
 *
 * @param {string[]} globs The globs of `pnpm-workspace.yaml`.
 * @returns {string[]} The relative folder of every manifest, sorted.
 */
function packageFolders(globs) {
  const folders = new Set();
  for (const glob of globs) {
    const parent = glob.slice(0, -2);
    const dir = join(FIXTURE_ROOT, parent);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const folder = `${parent}/${entry.name}`;
      if (existsSync(join(FIXTURE_ROOT, folder, "package.json"))) folders.add(folder);
    }
  }
  return [...folders].sort();
}

/**
 * Read the workspace manifests of the fixture tree.
 *
 * @param {string[]} globs The globs of `pnpm-workspace.yaml`.
 * @returns {Map<string, { folder: string, name: string, hasTest: boolean, deps: string[] }>} The packages by folder.
 */
function workspacePackages(globs) {
  const packages = new Map();
  for (const folder of packageFolders(globs)) {
    const manifest = JSON.parse(readFileSync(join(FIXTURE_ROOT, folder, "package.json"), "utf8"));
    const deps = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]
      .flatMap((field) => Object.keys(manifest[field] ?? {}));
    packages.set(folder, {
      folder,
      name: String(manifest.name ?? ""),
      hasTest: manifest.scripts?.test !== undefined,
      deps,
    });
  }
  return packages;
}

/**
 * Get the `Test` step of a workflow.
 *
 * @param {Record<string, unknown>} doc The parsed workflow.
 * @returns {Record<string, unknown>} The step.
 * @throws {Error} When the workflow holds no step named `Test`.
 */
function testStep(doc) {
  for (const { step } of allSteps(doc)) {
    if (String(step.name ?? "") === "Test") return step;
  }
  throw new Error("missing Test step in .github/workflows/ci.yml");
}

/**
 * Read the filter roots of the `Test` step.
 *
 * Every `--filter=` token must end with `...`, so the root covers the package and its
 * workspace dependencies. A filter without the suffix is rejected: it would hide a
 * dependency's tests.
 *
 * @param {Record<string, unknown>} step The `Test` step.
 * @returns {string[]} The filter roots.
 */
function filterRoots(step) {
  const run = String(step.run ?? "");
  const tokens = [...run.matchAll(/--filter=(?:"([^"]+)"|'([^']+)'|(\S+))/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
  must(tokens.length >= 1, `the Test step holds no --filter= token; run=${JSON.stringify(run)}`);
  const roots = [];
  for (const token of tokens) {
    must(
      token.endsWith("..."),
      `the Test step filter ${token} does not end with "...": the package dependencies do not run`,
    );
    roots.push(token.slice(0, -3));
  }
  return roots;
}

/**
 * Add one package and its workspace dependencies to the covered set.
 *
 * @param {string} folder The package folder.
 * @param {Map<string, { folder: string, name: string, hasTest: boolean, deps: string[] }>} packages The packages by folder.
 * @param {Map<string, string>} byName The folder of every package name.
 * @param {Set<string>} covered The covered folders.
 * @returns {void}
 */
function visit(folder, packages, byName, covered) {
  if (covered.has(folder)) return;
  covered.add(folder);
  for (const dep of packages.get(folder).deps) {
    const target = byName.get(dep);
    if (target) visit(target, packages, byName, covered);
  }
}

describe("CI review remediation", () => {
  it("CI-R1 every test-bearing workspace package is inside the job filter closure", () => {
    const globs = workspaceGlobs();
    const packages = workspacePackages(globs);
    must(
      packages.size >= MIN_TEST_PACKAGES,
      `workspace_packages=${packages.size} workspace_globs=${globs.length}`,
    );
    const testPackages = [...packages.values()].filter((pkg) => pkg.hasTest);
    must(
      testPackages.length >= MIN_TEST_PACKAGES,
      `test_packages=${testPackages.length} floor=${MIN_TEST_PACKAGES} workspace_globs=${globs.length}`,
    );

    const byName = new Map();
    for (const pkg of packages.values()) {
      if (pkg.name !== "") byName.set(pkg.name, pkg.folder);
    }

    const table = JSON.parse(readText("scripts/ci/apps.json"));
    must(Array.isArray(table) && table.length >= MIN_TABLE_ROWS, `table_rows=${table?.length}`);
    const byRowId = new Map(table.map((row) => [String(row.id), String(row.path)]));

    const doc = workflow("ci.yml");
    const runRoots = filterRoots(testStep(doc));
    const roots = [...runRoots, ...table.map((row) => String(row.id))];
    must(roots.length >= 13, `filter_roots=${roots.length}`);

    const covered = new Set();
    for (const root of roots) {
      const folder = byRowId.get(root) ?? byName.get(root);
      must(
        folder && packages.has(folder),
        `filter root ${root} resolves to no workspace package; test_packages=${testPackages.length}`,
      );
      visit(folder, packages, byName, covered);
    }

    const uncovered = testPackages.filter((pkg) => !covered.has(pkg.folder));
    must(
      uncovered.length === 0,
      `uncovered_test_packages=${uncovered.length} names=${uncovered
        .map((pkg) => pkg.name)
        .join(",")} test_packages=${testPackages.length} filter_roots=${
        roots.length
      } workspace_globs=${globs.length}`,
    );
    console.log(
      `uncovered_test_packages=0 test_packages=${testPackages.length} filter_roots=${roots.length} workspace_globs=${globs.length}`,
    );
  });

  it("CI-R2 the script refuses a table id that is not a safe workspace id", () => {
    must(UNSAFE_IDS.length === 3, `unsafe_ids=${UNSAFE_IDS.length}`);
    for (const id of UNSAFE_IDS) {
      const files = syntheticWorkspace();
      files["scripts/ci/apps.json"] = tableText([
        {
          id,
          path: "apps/alpha",
          service: "alpha",
          project: "$PROJECT_ID",
          region: "asia-southeast1",
          cloudbuild: "apps/alpha/cloudbuild.yaml",
          mode: "direct",
          tagPrefix: "",
        },
      ]);
      const { dir, sha: base } = makeRepo(files);
      const head = commitChanges(dir, { write: { "docs/ci-unsafe-probe.md": "# probe\n" } });
      const result = runScript(dir, base, head);
      expectRefusal(result, `unsafe id ${JSON.stringify(id)}`);
    }

    const table = JSON.parse(readText("scripts/ci/apps.json"));
    must(Array.isArray(table) && table.length >= MIN_TABLE_ROWS, `table_rows=${table?.length}`);
    const unsafeReal = table.filter((row) => !SAFE_ID.test(String(row.id)));
    must(
      unsafeReal.length === 0,
      `safe_pattern=${SAFE_ID} rejected_ids=${unsafeReal.map((row) => row.id).join(",")}`,
    );

    const range = planRepo({ write: { "docs/ci-safe-probe.md": "# probe\n" } });
    const control = runScript(range.dir, range.base, range.head);
    must(
      control.status === 0,
      `the real table was refused: exit=${control.status} stderr=${control.stderr.trim()}`,
    );
    const planned = JSON.parse(control.stdout);
    must(Array.isArray(planned), `the real table gave no JSON array: ${JSON.stringify(control.stdout)}`);
    must(table.length >= MIN_TABLE_ROWS, `safe_table_rows=${table.length}`);
    console.log(`unsafe_ids_refused=${UNSAFE_IDS.length} safe_table_rows=${table.length}`);
  });

  it("CI-R3 ci.yml holds contents: read at workflow level and no job widens it", () => {
    const doc = workflow("ci.yml");
    const expected = JSON.stringify({ contents: "read" });
    must(
      doc.permissions !== null &&
        typeof doc.permissions === "object" &&
        !Array.isArray(doc.permissions),
      `ci.yml has no workflow-level permissions map; permissions=${JSON.stringify(doc.permissions)}`,
    );
    must(
      JSON.stringify(doc.permissions) === expected,
      `ci.yml permissions=${JSON.stringify(doc.permissions)} expected=${expected}`,
    );
    const jobs = Object.entries(doc.jobs ?? {});
    must(jobs.length >= 3, `jobs=${jobs.length}`);
    for (const [name, job] of jobs) {
      const jobPermissions = job?.permissions;
      if (jobPermissions === undefined) continue;
      must(
        JSON.stringify(jobPermissions) === expected,
        `job ${name} widens the permissions: ${JSON.stringify(jobPermissions)} workflow=${expected}`,
      );
    }
    console.log(`ci_permissions=${expected} jobs_checked=${jobs.length}`);
  });
});
