/**
 * Red tests for the affected-app logic of the track `per_app_cicd_20261107`.
 *
 * Every case runs the real script `scripts/ci/affected-apps.mjs` on a scratch git
 * repository that the harness builds. The scratch repository holds the real
 * workspace manifests or a synthetic mini workspace.
 *
 * The file is the contract of the Green role. A case names the behavior that the
 * script must show. A case that passes at the Red base is a characterization case
 * and is named in the Red evidence.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  ROOT,
  TABLE_ROWS,
  WORKSPACE_GLOBS,
  changedFileCount,
  commitChanges,
  defaultSyntheticApps,
  defaultSyntheticPackages,
  expectIds,
  expectRefusal,
  fixtureTable,
  git,
  gitEnv,
  makeRepo,
  realWorkspaceFiles,
  removeScratchDirs,
  requireNonEmpty,
  runScript,
  runScriptArgs,
  setOriginMaster,
  syntheticWorkspace,
  unrelatedRootCommit,
  workspaceSeedFiles,
} from "./helpers/scratch.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The base of a new branch, 40 zeros. */
const ZERO_BASE = "0".repeat(40);

/** The ids of the 10 rows of the app table. */
const ALL_ROWS = TABLE_ROWS.map((row) => row.id);

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

/** The rows that depend on `packages/integrations/github` through the workspace graph. */
const INTEGRATIONS_ROWS = [
  "codecamp-advantage",
  "marketing",
  "primary-advantage",
  "reading-advantage",
  "sales-advantage",
  "workbooks",
];

/** The one-off Cloud Build files that no row of the table holds. */
const ONE_OFF_CLOUDBUILD_FILES = [
  "apps/primary-advantage/cloudbuild-backfill.yaml",
  "apps/primary-advantage/cloudbuild-catalogue.yaml",
  "apps/primary-advantage/cloudbuild-etl.yaml",
  "apps/sales-advantage/cloudbuild.continue-f5063222.yaml",
];

/** The cached copy of the real workspace files. */
let workspaceFilesCache = null;

/**
 * Get the real workspace files of the repository.
 *
 * @returns {Record<string, string>} The relative path and text of every file.
 */
function workspaceFiles() {
  if (!workspaceFilesCache) workspaceFilesCache = realWorkspaceFiles();
  return workspaceFilesCache;
}

/**
 * Build a scratch repository that holds the real workspace manifests.
 *
 * @returns {{ dir: string, sha: string, files: Record<string, string> }} The scratch repository.
 */
function workspaceRepo() {
  const files = { ...workspaceFiles(), ...workspaceSeedFiles() };
  const repo = makeRepo(files);
  return { ...repo, files };
}

/**
 * Build a scratch repository that holds the synthetic mini workspace.
 *
 * @param {object} [config] The shape of the workspace.
 * @returns {{ dir: string, sha: string, files: Record<string, string> }} The scratch repository.
 */
function syntheticRepo(config = {}) {
  const files = syntheticWorkspace(config);
  const repo = makeRepo(files);
  return { ...repo, files };
}

/**
 * Replace one text and fail when the text is missing.
 *
 * @param {string} text The text to change.
 * @param {string} from The text to replace.
 * @param {string} to The replacement text.
 * @returns {string} The changed text.
 */
function replaceOnce(text, from, to) {
  if (!text.includes(from)) {
    throw new Error(`the fixture text ${JSON.stringify(from)} is missing`);
  }
  return text.replace(from, to);
}

/**
 * Find the line range of a top-level section of the lockfile.
 *
 * @param {string[]} lines The lines of the lockfile.
 * @param {string} section The name of the section.
 * @returns {{ start: number, end: number }} The line range of the section.
 */
function sectionBounds(lines, section) {
  const start = lines.findIndex((line) => line === `${section}:`);
  if (start < 0) throw new Error(`the lockfile section ${section} is missing`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\S/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { start, end };
}

/**
 * Replace one text inside a top-level section of the lockfile.
 *
 * @param {string} text The text of the lockfile.
 * @param {string} section The name of the section.
 * @param {string} from The text to replace.
 * @param {string} to The replacement text.
 * @returns {string} The changed text.
 */
function replaceInSection(text, section, from, to) {
  const lines = text.split("\n");
  const { start, end } = sectionBounds(lines, section);
  let count = 0;
  for (let index = start; index < end; index += 1) {
    if (lines[index].includes(from)) {
      lines[index] = lines[index].replace(from, to);
      count += 1;
    }
  }
  if (count !== 1) {
    throw new Error(`the lockfile section ${section} holds ${count} copies of ${from}`);
  }
  return lines.join("\n");
}

/**
 * Raise the patch number of a version text.
 *
 * @param {string} value The version text.
 * @returns {string} The changed version text.
 */
function bumpVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(value);
  if (!match) throw new Error(`the version ${value} holds no patch part`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4]}`;
}

/**
 * Change one version line of an importer block of the lockfile.
 *
 * The first plain version of the block changes. A version with a peer suffix
 * changes only when the block holds no plain version.
 *
 * @param {string} text The text of the lockfile.
 * @param {string} importerPath The path of the importer.
 * @returns {string} The changed text.
 */
function editImporterVersion(text, importerPath) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === `  ${importerPath}:`);
  if (start < 0) throw new Error(`the importer ${importerPath} is missing from the lockfile`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  \S/.test(lines[index]) || /^\S/.test(lines[index])) {
      end = index;
      break;
    }
  }
  const versions = [];
  for (let index = start + 1; index < end; index += 1) {
    const match = /^        version: (.+)$/.exec(lines[index]);
    if (match) versions.push({ index, value: match[1] });
  }
  if (versions.length === 0) throw new Error(`the importer ${importerPath} holds no version line`);
  const plain = versions.find((entry) => /^\d+\.\d+\.\d+$/.test(entry.value)) ?? versions[0];
  lines[plain.index] = `        version: ${bumpVersion(plain.value)}`;
  return lines.join("\n");
}

/**
 * Build the workspace graph of the copied manifests.
 *
 * @param {Record<string, string>} files The copied manifests.
 * @returns {Map<string, { path: string, deps: Set<string> }>} The graph of the workspace.
 */
function workspaceGraph(files) {
  const packages = new Map();
  for (const [path, text] of Object.entries(files)) {
    if (!path.endsWith("package.json")) continue;
    const manifest = JSON.parse(text);
    const deps = new Set();
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      for (const name of Object.keys(manifest[field] ?? {})) deps.add(name);
    }
    packages.set(manifest.name, { path, deps });
  }
  return packages;
}

/**
 * List the packages that reach a package through the workspace graph.
 *
 * @param {string} target The name of the package.
 * @param {Map<string, { path: string, deps: Set<string> }>} packages The workspace graph.
 * @returns {string[]} The names of the packages that reach the target.
 */
function dependentsOf(target, packages) {
  const dependents = [];
  for (const [name, entry] of packages) {
    if (name === target) continue;
    const seen = new Set();
    const queue = [...entry.deps];
    let reaches = false;
    while (queue.length > 0) {
      const current = queue.pop();
      if (current === target) {
        reaches = true;
        break;
      }
      if (seen.has(current)) continue;
      seen.add(current);
      const next = packages.get(current);
      if (next) queue.push(...next.deps);
    }
    if (reaches) dependents.push(name);
  }
  return dependents.sort();
}

/**
 * Raise a failure when a premise of the spec no longer holds.
 *
 * @param {boolean} condition The premise.
 * @param {string} message The text of the failure.
 * @returns {void}
 */
function requirePremise(condition, message) {
  if (!condition) throw new Error(`the premise of the spec changed: ${message}`);
}

/**
 * List the table rows whose manifest holds a package with the value `catalog:`.
 *
 * @param {Record<string, string>} files The copied manifests.
 * @param {string} name The name of the package.
 * @returns {string[]} The ids of the rows.
 */
function catalogRows(files, name) {
  const rows = [];
  for (const row of TABLE_ROWS) {
    const manifest = JSON.parse(files[`${row.path}/package.json`]);
    const all = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    };
    if (all[name] === "catalog:") rows.push(row.id);
  }
  return rows.sort();
}

afterEach(() => {
  removeScratchDirs();
});

describe("P1 harness guards", () => {
  it("A7-01 the helper guards fire on an empty list", () => {
    expect(() => requireNonEmpty([], "A7-01 list")).toThrow(/must not be empty/);
    expect(() =>
      expectIds({ status: 0, stdout: "[]\n", stderr: "" }, [], "A7-01 empty result", 0),
    ).toThrow(/changed_files=0/);
  });

  it("B-22 the helper env scrubs the git variables", () => {
    const env = gitEnv("/tmp/scratch-home");
    expect(env.GIT_CONFIG_GLOBAL).toBe("/dev/null");
    expect(env.GIT_CONFIG_NOSYSTEM).toBe("1");
    for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX"]) {
      expect(env[key]).toBeUndefined();
    }
  });
});

describe("P1 premise guards", () => {
  it("P-01 read_along_dependents=1", () => {
    const packages = workspaceGraph(workspaceFiles());
    const dependents = dependentsOf("@reading-advantage/read-along", packages);
    requirePremise(
      dependents.length === 1,
      `read_along_dependents=${dependents.length} instead of 1: ${dependents.join(",")}`,
    );
    requirePremise(
      dependents.includes("storytime"),
      `read_along_dependents names ${dependents.join(",")} instead of storytime`,
    );
  });

  it("P-02 utils_rows=7", () => {
    const packages = workspaceGraph(workspaceFiles());
    const rows = dependentsOf("@reading-advantage/utils", packages).filter((name) =>
      ALL_ROWS.includes(name),
    );
    requirePremise(
      rows.length === 7,
      `utils_rows=${rows.length} instead of 7: ${rows.join(",")}`,
    );
  });

  it("P-03 integrations_rows=6", () => {
    const packages = workspaceGraph(workspaceFiles());
    const rows = dependentsOf("@reading-advantage/integrations-github", packages).filter((name) =>
      ALL_ROWS.includes(name),
    );
    requirePremise(
      rows.length === 6,
      `integrations_rows=${rows.length} instead of 6: ${rows.join(",")}`,
    );
  });
});

describe("P1 group A: the acceptance checks of the spec", () => {
  it("A1-01 a www-only change returns www-reading-advantage", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: {
        "apps/www-reading-advantage/src/app/page.tsx":
          "export default function Page() {\n  return <main>www</main>;\n}\n",
      },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["www-reading-advantage"], `A1-01 rows=1 changed_files=${changed}`, changed);
  });

  it("A1-02 a storytime-only change returns storytime", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: {
        "apps/storytime/app/page.tsx":
          "export default function Page() {\n  return <main>storytime</main>;\n}\n",
      },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["storytime"], `A1-02 rows=1 changed_files=${changed}`, changed);
  });

  it("A3-01 a change of packages/read-along returns storytime", () => {
    const { dir, sha: base } = workspaceRepo();
    const packages = workspaceGraph(workspaceFiles());
    const dependents = dependentsOf("@reading-advantage/read-along", packages);
    requirePremise(
      dependents.length === 1 && dependents.includes("storytime"),
      `read_along_dependents=${dependents.length} instead of 1`,
    );
    const head = commitChanges(dir, {
      write: { "packages/read-along/src/index.ts": "export const readAlong = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      ["storytime"],
      `A3-01 rows=1 changed_files=${changed} read_along_dependents=${dependents.length}`,
      changed,
    );
  });

  it("A3-02 a change of packages/utils returns the 7 rows of the graph", () => {
    const { dir, sha: base } = workspaceRepo();
    const packages = workspaceGraph(workspaceFiles());
    const rows = dependentsOf("@reading-advantage/utils", packages).filter((name) =>
      ALL_ROWS.includes(name),
    );
    requirePremise(rows.length === 7, `utils_rows=${rows.length} instead of 7`);
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      UTILS_ROWS,
      `A3-02 rows=${UTILS_ROWS.length} changed_files=${changed} utils_rows=${rows.length}`,
      changed,
    );
  });

  it("A4-01 a lockfile change of one app dependency returns that app", () => {
    const { dir, sha: base, files } = syntheticRepo();
    let lock = files["pnpm-lock.yaml"];
    lock = replaceOnce(lock, "        version: 5.3.0\n", "        version: 5.3.1\n");
    lock = replaceOnce(lock, "  chalk@5.3.0:\n", "  chalk@5.3.1:\n");
    lock = replaceOnce(
      lock,
      "  chalk@5.3.0(ansi-styles@6.2.1):\n",
      "  chalk@5.3.1(ansi-styles@6.2.1):\n",
    );
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["alpha"], `A4-01 rows=1 changed_files=${changed}`, changed);
  });

  it("A4-02 a lockfile change of a shared dependency returns both apps", () => {
    const { dir, sha: base, files } = syntheticRepo();
    let lock = files["pnpm-lock.yaml"];
    lock = lock.replaceAll("        version: 3.25.76\n", "        version: 3.25.77\n");
    lock = replaceOnce(lock, "  zod@3.25.76:\n", "  zod@3.25.77:\n");
    lock = replaceOnce(lock, "  zod@3.25.76: {}\n", "  zod@3.25.77: {}\n");
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["alpha", "beta"], `A4-02 rows=2 changed_files=${changed}`, changed);
  });

  it("A4-03 a lockfile change of a transitive entry returns the app that resolves it", () => {
    const { dir, sha: base, files } = syntheticRepo();
    const lock = replaceOnce(
      files["pnpm-lock.yaml"],
      "  ansi-styles@6.2.1: {}\n",
      "  ansi-styles@6.2.2: {}\n",
    );
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["alpha"], `A4-03 rows=1 changed_files=${changed}`, changed);
  });

  it("A4-04 a lockfile change of the www importer returns www", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const lock = editImporterVersion(files["pnpm-lock.yaml"], "apps/www-reading-advantage");
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      ["www-reading-advantage"],
      `A4-04 rows=1 changed_files=${changed}`,
      changed,
    );
  });

  it("A4-05 a lockfile change of the read-along importer returns storytime", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const lock = editImporterVersion(files["pnpm-lock.yaml"], "packages/read-along");
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["storytime"], `A4-05 rows=1 changed_files=${changed}`, changed);
  });

  it("A4-06 a lockfile entry that no importer reaches returns no app", () => {
    const { dir, sha: base, files } = syntheticRepo();
    const lock = replaceOnce(
      files["pnpm-lock.yaml"],
      "\nsnapshots:\n",
      "\n  unused-package@1.0.0:\n    resolution: {integrity: sha512-fixture-unused}\n\nsnapshots:\n",
    );
    const head = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, [], `A4-06 rows=0 changed_files=${changed}`, changed);
  });

  it("A5-01 a docs-only change returns no app", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const head = commitChanges(dir, {
      write: {
        "docs/a.md": "# a\n",
        "measure/tracks/some-track/plan.md": "# some track\n",
        ".github/workflows/ci.yml": "name: ci\n",
        "README.md": "# read me\n",
        "scripts/ci/apps.json": `${fixtureTable()} `,
      },
    });
    const changed = changedFileCount(dir, base, head);
    expect(changed).toBe(5);
    const result = runScript(dir, base, head);
    expectIds(result, [], `A5-01 rows=0 changed_files=${changed}`, changed);
  });

  it("A6-01 a zero base falls back to the merge base with origin/master", () => {
    const { dir, sha: base } = workspaceRepo();
    setOriginMaster(dir, base);
    const head = commitChanges(dir, {
      write: {
        "apps/storytime/app/page.tsx":
          "export default function Page() {\n  return <main>storytime</main>;\n}\n",
      },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, ZERO_BASE, head);
    expectIds(result, ["storytime"], `A6-01 rows=1 changed_files=${changed}`, changed);
  });

  it("A6-02 a zero base without origin/master is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const result = runScript(dir, ZERO_BASE, head);
    expectRefusal(result, "A6-02 bad_bases=1");
  });

  it("A6-03 a zero base with an empty range is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    setOriginMaster(dir, head);
    const result = runScript(dir, ZERO_BASE, head);
    expectRefusal(result, "A6-03 bad_bases=1");
  });

  it("A6-04 a zero base without a merge base is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    setOriginMaster(dir, unrelatedRootCommit(dir));
    const result = runScript(dir, ZERO_BASE, head);
    expectRefusal(result, "A6-04 bad_bases=1");
  });

  it("A6-05 a base that the clone does not hold is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const result = runScript(dir, "deadbeef".repeat(5), head);
    expectRefusal(result, "A6-05 bad_bases=1");
  });

  it("A6-06 a shallow clone refuses a base that the clone lacks", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const clone = `${dir}-shallow`;
    const cloned = git(dir, ["clone", "-q", "--depth", "1", `file://${dir}`, clone]);
    expect(cloned.status).toBe(0);
    const result = runScript(clone, base, head);
    expectRefusal(result, "A6-06 bad_bases=1");
  });

  it("A6-07 every bad base is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const badBases = [
      "",
      "HEAD",
      "master",
      "HEAD~1",
      "abcdef0",
      "a".repeat(39),
      "a".repeat(41),
      "g".repeat(40),
      `${"a".repeat(39)} `,
    ];
    requireNonEmpty(badBases, "A6-07 bad_bases");
    expect(badBases.length).toBeGreaterThanOrEqual(9);
    for (const badBase of badBases) {
      const result = runScript(dir, badBase, head);
      expectRefusal(result, `A6-07 bad_bases=${badBases.length} base=${JSON.stringify(badBase)}`);
    }
  });

  it("A6-08 every bad head is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const badHeads = [
      "",
      "HEAD",
      "master",
      "HEAD~1",
      "abcdef0",
      "a".repeat(39),
      "a".repeat(41),
      "g".repeat(40),
      `${"a".repeat(39)} `,
    ];
    requireNonEmpty(badHeads, "A6-08 bad_heads");
    expect(badHeads.length).toBeGreaterThanOrEqual(6);
    for (const badHead of badHeads) {
      const result = runScript(dir, base, badHead);
      expectRefusal(result, `A6-08 bad_heads=${badHeads.length} head=${JSON.stringify(badHead)}`);
    }
  });

  it("A6-09 an option or shell injection creates no file", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const target = join(dir, "injected.txt");
    const injections = [`--output=${target}`, `$(touch ${target})`];
    requireNonEmpty(injections, "A6-09 injection_files");
    for (const injection of injections) {
      const asBase = runScript(dir, injection, head);
      expectRefusal(asBase, `A6-09 injection_files=0 base=${JSON.stringify(injection)}`);
      const asHead = runScript(dir, base, injection);
      expectRefusal(asHead, `A6-09 injection_files=0 head=${JSON.stringify(injection)}`);
      expect(existsSync(target)).toBe(false);
    }
  });

  it("A6-10 every wrong argument form is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const forms = [
      [],
      ["--head", head],
      ["--base", base],
      ["--base", base, "--head", head, "--unknown"],
      ["--base", base, "--base", base, "--head", head],
      ["--base", base, "--head", head, "extra"],
      [base, head],
    ];
    requireNonEmpty(forms, "A6-10 argument_forms");
    for (const form of forms) {
      const result = runScriptArgs(dir, form);
      expectRefusal(result, `A6-10 argument_forms=${forms.length} args=${JSON.stringify(form)}`);
    }
  });

  it("A6-11 a base that is a blob or a tree is refused", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/utils/src/index.ts": "export const utils = false;\n" },
    });
    const blob = git(dir, ["hash-object", "-w", "--stdin"], { input: "blob\n" }).stdout.trim();
    const tree = git(dir, ["write-tree"]).stdout.trim();
    const bases = [blob, tree];
    requireNonEmpty(bases, "A6-11 bad_bases");
    for (const badBase of bases) {
      expect(badBase).toMatch(/^[0-9a-f]{40}$/);
      const result = runScript(dir, badBase, head);
      expectRefusal(result, `A6-11 bad_bases=${bases.length} base=${badBase}`);
    }
  });
});

describe("P1 group B: the cases from the measured facts", () => {
  it("B-01 a change of packages/integrations/github returns the 6 rows", () => {
    const { dir, sha: base } = workspaceRepo();
    const packages = workspaceGraph(workspaceFiles());
    const rows = dependentsOf("@reading-advantage/integrations-github", packages).filter((name) =>
      ALL_ROWS.includes(name),
    );
    requirePremise(rows.length === 6, `integrations_rows=${rows.length} instead of 6`);
    const head = commitChanges(dir, {
      write: { "packages/integrations/github/src/index.ts": "export const github = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      INTEGRATIONS_ROWS,
      `B-01 rows=${INTEGRATIONS_ROWS.length} changed_files=${changed} integrations_rows=${rows.length}`,
      changed,
    );
  });

  it("B-02 a change of a service returns no app", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "services/worker/src/index.ts": "export const worker = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    expect(changed).toBe(1);
    const result = runScript(dir, base, head);
    expectIds(result, [], `B-02 rows=0 changed_files=${changed}`, changed);
  });

  it("B-03 a change of an app that is not a table row returns no app", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: {
        "apps/science-advantage/app/page.tsx":
          "export default function Page() {\n  return <main>science</main>;\n}\n",
      },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, [], `B-03 rows=0 changed_files=${changed}`, changed);
  });

  it("B-04 a change of packages/config returns every row", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "packages/config/src/index.ts": "export const config = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ALL_ROWS, `B-04 rows=${ALL_ROWS.length} changed_files=${changed}`, changed);
  });

  it("B-05 a docs folder inside an app and a measure folder inside a package count", () => {
    const { dir, sha: base } = workspaceRepo();
    const first = commitChanges(dir, {
      write: { "apps/storytime/docs/note.md": "# storytime note\n\nmore\n" },
    });
    const firstChanged = changedFileCount(dir, base, first);
    const firstResult = runScript(dir, base, first);
    expectIds(firstResult, ["storytime"], `B-05 rows=1 changed_files=${firstChanged}`, firstChanged);
    const second = commitChanges(dir, {
      write: { "packages/utils/measure/x.ts": "export const measurement = false;\n" },
    });
    const secondChanged = changedFileCount(dir, first, second);
    const secondResult = runScript(dir, first, second);
    expectIds(
      secondResult,
      UTILS_ROWS,
      `B-05 rows=${UTILS_ROWS.length} changed_files=${secondChanged}`,
      secondChanged,
    );
  });

  it("B-06 an app folder with the prefix of an app id returns no app", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "apps/storytime-lab/x.ts": "export const lab = true;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, [], `B-06 rows=0 changed_files=${changed}`, changed);
  });

  it("B-07 a moved file counts at both paths", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      move: [["apps/storytime/app/old.ts", "docs/old.ts"]],
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["storytime"], `B-07 rows=1 changed_files=${changed}`, changed);
  });

  it("B-08 a path with a non-ASCII name and a space counts", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: { "apps/storytime/content/ไทย — one.json": "{}\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["storytime"], `B-08 rows=1 changed_files=${changed}`, changed);
  });

  it("B-09 a deleted file counts", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, { delete: ["apps/www-reading-advantage/src/x.ts"] });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      ["www-reading-advantage"],
      `B-09 rows=1 changed_files=${changed}`,
      changed,
    );
  });

  it("B-10 a change of an app manifest returns that app", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const manifest = JSON.parse(files["apps/accounts/package.json"]);
    manifest.scripts = { ...(manifest.scripts ?? {}), "measure:red": "node --version" };
    const head = commitChanges(dir, {
      write: { "apps/accounts/package.json": `${JSON.stringify(manifest, null, 2)}\n` },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["accounts"], `B-10 rows=1 changed_files=${changed}`, changed);
  });

  it("B-11 three commits return both apps and no app for the docs change", () => {
    const { dir, sha: base } = workspaceRepo();
    const first = commitChanges(dir, {
      write: { "apps/www-reading-advantage/src/app/page.tsx": "export const www = 1;\n" },
    });
    const second = commitChanges(dir, {
      write: { "apps/storytime/app/page.tsx": "export const storytime = 1;\n" },
    });
    const third = commitChanges(dir, { write: { "docs/a.md": "# a\n" } });
    const changed = changedFileCount(dir, base, third);
    const result = runScript(dir, base, third);
    expectIds(
      result,
      ["storytime", "www-reading-advantage"],
      `B-11 rows=2 changed_files=${changed}`,
      changed,
    );
  });

  it("B-12 the excluded row is printed", () => {
    const { dir, sha: base } = workspaceRepo();
    const head = commitChanges(dir, {
      write: {
        "apps/reading-advantage/app/page.tsx":
          "export default function Page() {\n  return <main>reading</main>;\n}\n",
      },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["reading-advantage"], `B-12 rows=1 changed_files=${changed}`, changed);
  });

  it("B-13 a package chain reaches every app through the four dependency fields", () => {
    const { dir, sha: base } = syntheticRepo();
    const head = commitChanges(dir, {
      write: { "packages/p3/src/index.ts": "export const p3 = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      ["alpha", "beta", "gamma"],
      `B-13 rows=3 changed_files=${changed}`,
      changed,
    );
  });

  it("B-14 a cycle between two packages ends", () => {
    const packages = defaultSyntheticPackages();
    packages.p2 = { dependencies: { "@fixture/p1": "workspace:*", "@fixture/p3": "workspace:*" } };
    const { dir, sha: base } = syntheticRepo({ packages });
    const head = commitChanges(dir, {
      write: { "packages/p1/src/index.ts": "export const p1 = false;\n" },
    });
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(
      result,
      ["alpha", "beta", "gamma"],
      `B-14 rows=3 changed_files=${changed}`,
      changed,
    );
  });

  it("B-15 the working tree does not change the answer", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const head = commitChanges(dir, {
      write: {
        "apps/storytime/app/page.tsx":
          "export default function Page() {\n  return <main>storytime</main>;\n}\n",
      },
    });
    const manifest = JSON.parse(files["apps/www-reading-advantage/package.json"]);
    manifest.version = "9.9.9";
    writeFileSync(
      join(dir, "apps/www-reading-advantage/package.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    writeFileSync(join(dir, "apps/accounts/untracked.ts"), "export const untracked = true;\n");
    const changed = changedFileCount(dir, base, head);
    const result = runScript(dir, base, head);
    expectIds(result, ["storytime"], `B-15 rows=1 changed_files=${changed}`, changed);
  });

  it("B-16 a base that equals the head is an empty range", () => {
    const { dir, sha: base } = workspaceRepo();
    const changed = changedFileCount(dir, base, base);
    expect(changed).toBe(0);
    const result = runScript(dir, base, base);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("[]\n");
  });

  it("B-17 every global input affects every row", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const globals = [
      {
        label: "pnpm-workspace.yaml nodeLinker",
        write: {
          "pnpm-workspace.yaml": replaceOnce(
            files["pnpm-workspace.yaml"],
            "nodeLinker: hoisted",
            "nodeLinker: isolated",
          ),
        },
      },
      {
        label: "pnpm-workspace.yaml verifyDepsBeforeRun",
        write: {
          "pnpm-workspace.yaml": replaceOnce(
            files["pnpm-workspace.yaml"],
            "verifyDepsBeforeRun: false",
            "verifyDepsBeforeRun: true",
          ),
        },
      },
      {
        label: "package.json devDependencies",
        write: {
          "package.json": replaceOnce(files["package.json"], '"turbo": "^2.5.2"', '"turbo": "^2.5.3"'),
        },
      },
      {
        label: "turbo.json globalEnv",
        write: {
          "turbo.json": replaceOnce(
            files["turbo.json"],
            '    "DATABASE_URL"\n',
            '    "DATABASE_URL",\n    "MEASURE_RED"\n',
          ),
        },
      },
      {
        label: ".pnpmfile.cjs",
        write: { ".pnpmfile.cjs": `${files[".pnpmfile.cjs"]}\n// measure red\n` },
      },
      {
        label: ".dockerignore",
        write: { ".dockerignore": `${files[".dockerignore"]}\nmeasure-red\n` },
      },
      {
        label: "pnpm-lock.yaml settings",
        write: {
          "pnpm-lock.yaml": replaceOnce(
            files["pnpm-lock.yaml"],
            "  autoInstallPeers: true",
            "  autoInstallPeers: false",
          ),
        },
      },
    ];
    requireNonEmpty(globals, "B-17 globals_checked");
    expect(globals.length).toBe(7);
    let head = base;
    for (const global of globals) {
      head = commitChanges(dir, { write: global.write });
      const changed = changedFileCount(dir, base, head);
      expect(
        changed,
        `B-17 global=${global.label} changed_files=${changed} globals_checked=${globals.length}`,
      ).toBeGreaterThanOrEqual(1);
      const result = runScript(dir, base, head);
      expectIds(
        result,
        ALL_ROWS,
        `B-17 rows=${ALL_ROWS.length} changed_files=${changed} global=${global.label} globals_checked=${globals.length}`,
        changed,
      );
    }
  });

  it("B-18 a catalog entry affects only the rows that use it", () => {
    const { dir, sha: base, files } = workspaceRepo();
    const expected = catalogRows(files, "zod");
    requireNonEmpty(expected, "B-18 catalog_rows");
    const workspaceText = replaceOnce(
      files["pnpm-workspace.yaml"],
      "  zod: ^3.25.76",
      "  zod: ^3.26.0",
    );
    let lock = files["pnpm-lock.yaml"];
    lock = replaceInSection(lock, "catalogs", "      specifier: ^3.25.76", "      specifier: ^3.26.0");
    lock = replaceInSection(lock, "catalogs", "      version: 3.25.76", "      version: 3.26.0");
    const first = commitChanges(dir, {
      write: { "pnpm-workspace.yaml": workspaceText, "pnpm-lock.yaml": lock },
    });
    const firstChanged = changedFileCount(dir, base, first);
    const firstResult = runScript(dir, base, first);
    expectIds(
      firstResult,
      expected,
      `B-18 rows=${expected.length} changed_files=${firstChanged}`,
      firstChanged,
    );
    const second = commitChanges(dir, {
      write: {
        "pnpm-workspace.yaml": replaceOnce(
          workspaceText,
          "  zod: ^3.26.0",
          "  zod: ^3.26.0\n  \"unused-catalog-package\": ^1.0.0",
        ),
      },
    });
    const secondChanged = changedFileCount(dir, first, second);
    const secondResult = runScript(dir, first, second);
    expectIds(
      secondResult,
      [],
      `B-18 rows=0 changed_files=${secondChanged}`,
      secondChanged,
    );
  });

  it("B-19 an override entry affects only the rows that resolve it", () => {
    const apps = defaultSyntheticApps();
    apps.alpha = { dependencies: { chalk: "5.3.0" } };
    apps.beta = { dependencies: { zod: "3.25.76" } };
    const { dir, sha: base, files } = syntheticRepo({ apps });
    let lock = files["pnpm-lock.yaml"];
    lock = replaceOnce(lock, "  ansi-styles: 6.2.1", "  ansi-styles: 6.2.2");
    const first = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const firstChanged = changedFileCount(dir, base, first);
    const firstResult = runScript(dir, base, first);
    expectIds(firstResult, ["alpha"], `B-19 rows=1 changed_files=${firstChanged}`, firstChanged);
    lock = replaceOnce(lock, "  zod: 3.25.76", "  zod: 3.25.77");
    const second = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const secondChanged = changedFileCount(dir, first, second);
    const secondResult = runScript(dir, first, second);
    expectIds(secondResult, ["beta"], `B-19 rows=1 changed_files=${secondChanged}`, secondChanged);
    lock = replaceOnce(lock, "  zod: 3.25.77", "  zod: 3.25.77\n  unused-override: 1.0.0");
    const third = commitChanges(dir, { write: { "pnpm-lock.yaml": lock } });
    const thirdChanged = changedFileCount(dir, second, third);
    const thirdResult = runScript(dir, second, third);
    expectIds(thirdResult, [], `B-19 rows=0 changed_files=${thirdChanged}`, thirdChanged);
  });

  it("B-20 every success case prints one JSON line with sorted ids", () => {
    const { dir, sha: base } = workspaceRepo();
    const changes = [
      "apps/www-reading-advantage/src/app/page.tsx",
      "apps/storytime/app/page.tsx",
      "apps/primary-advantage/app/page.tsx",
      "apps/accounts/app/page.tsx",
      "apps/workbooks/app/page.tsx",
      "apps/accounting/app/page.tsx",
      "apps/codecamp-advantage/app/page.tsx",
      "apps/marketing/app/page.tsx",
      "apps/sales-advantage/app/page.tsx",
      "apps/reading-advantage/app/page.tsx",
      "packages/read-along/src/index.ts",
      "packages/utils/src/index.ts",
      "packages/config/src/index.ts",
      "packages/db/src/index.ts",
      "packages/integrations/github/src/index.ts",
      "services/worker/src/index.ts",
      "docs/a.md",
      "measure/tracks/some-track/plan.md",
      "README.md",
      "apps/science-advantage/app/page.tsx",
    ];
    requireNonEmpty(changes, "B-20 success_cases_checked");
    let checked = 0;
    for (const path of changes) {
      const head = commitChanges(dir, { write: { [path]: `export const ${checked} = true;\n` } });
      const result = runScript(dir, base, head);
      const label = `B-20 success_cases_checked=${changes.length} path=${path}`;
      expect(result.status, label).toBe(0);
      expect(result.stdout.endsWith("\n"), label).toBe(true);
      expect(result.stdout.slice(0, -1).includes(" "), label).toBe(false);
      expect(result.stdout.split("\n").length, label).toBe(2);
      const ids = JSON.parse(result.stdout);
      expect(Array.isArray(ids), label).toBe(true);
      expect([...ids].sort(), label).toEqual(ids);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it("B-21 the real table holds the 10 rows of spec section 2a", () => {
    const tablePath = join(ROOT, "scripts", "ci", "apps.json");
    if (!existsSync(tablePath)) throw new Error("Missing scripts/ci/apps.json");
    const rows = JSON.parse(readFileSync(tablePath, "utf8"));
    expect(rows.length, "B-21 rows=10").toBe(10);
    const baseKeys = ["id", "path", "service", "project", "region", "cloudbuild", "mode", "tagPrefix"];
    const gatedKeys = [...baseKeys, "tag", "tagLength"].sort();
    const ids = new Set();
    const paths = new Set();
    const services = new Set();
    let direct = 0;
    let gated = 0;
    let excluded = 0;
    for (const row of rows) {
      const keys = Object.keys(row).sort();
      if (row.mode === "gated") {
        expect(keys, `B-21 row=${row.id}`).toEqual(gatedKeys);
        gated += 1;
      } else {
        expect(keys, `B-21 row=${row.id}`).toEqual([...baseKeys].sort());
      }
      if (row.mode === "direct") direct += 1;
      if (row.mode === "excluded") excluded += 1;
      expect(ids.has(row.id), `B-21 row=${row.id}`).toBe(false);
      expect(paths.has(row.path), `B-21 row=${row.id}`).toBe(false);
      expect(services.has(row.service), `B-21 row=${row.id}`).toBe(false);
      ids.add(row.id);
      paths.add(row.path);
      services.add(row.service);
      const manifest = JSON.parse(readFileSync(join(ROOT, row.path, "package.json"), "utf8"));
      expect(manifest.name, `B-21 row=${row.id}`).toBe(row.id);
      expect(row.region, `B-21 row=${row.id}`).toBe("asia-southeast1");
      const tracked = git(ROOT, ["ls-files", "--error-unmatch", "--", row.cloudbuild]);
      expect(tracked.status, `B-21 row=${row.id} cloudbuild=${row.cloudbuild}`).toBe(0);
      if (row.mode === "gated") {
        expect(row.tagPrefix, `B-21 row=${row.id}`).not.toBe("");
        expect(typeof row.tag, `B-21 row=${row.id}`).toBe("string");
        expect(row.tag.length, `B-21 row=${row.id}`).toBeGreaterThan(0);
        expect(Number.isInteger(row.tagLength), `B-21 row=${row.id}`).toBe(true);
        expect(row.tagLength, `B-21 row=${row.id}`).toBeGreaterThan(0);
      } else {
        expect(row.tagPrefix, `B-21 row=${row.id}`).toBe("");
      }
    }
    expect(direct, "B-21 direct=1").toBe(1);
    expect(gated, "B-21 gated=8").toBe(8);
    expect(excluded, "B-21 excluded=1").toBe(1);
    expect(ids.has("www-reading-advantage"), "B-21 direct row").toBe(true);
    expect(ids.has("reading-advantage"), "B-21 excluded row").toBe(true);
    for (const oneOff of ONE_OFF_CLOUDBUILD_FILES) {
      const used = rows.filter((row) => row.cloudbuild === oneOff || row.cloudbuild.endsWith(oneOff));
      expect(used.length, `B-21 one_off=${oneOff}`).toBe(0);
    }
    const workspaceText = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
    const lines = workspaceText.split("\n");
    const start = lines.indexOf("packages:");
    expect(start, "B-21 workspace_packages").toBeGreaterThan(-1);
    const globs = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      if (!lines[index].startsWith("  - ")) break;
      globs.push(lines[index].replace(/^  - "/, "").replace(/"$/, ""));
    }
    expect(globs, "B-21 workspace_globs=4").toEqual(WORKSPACE_GLOBS);
  });
});
