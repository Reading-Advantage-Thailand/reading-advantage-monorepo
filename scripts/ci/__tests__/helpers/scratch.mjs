/**
 * Scratch harness for the affected-app Red tests of the track `per_app_cicd_20261107`.
 *
 * The harness builds throwaway git repositories under a temporary folder. It never
 * touches the repository that holds the tests. Every git call runs with a scrubbed
 * environment so that the git defaults of the CI runner apply.
 *
 * @module scratch
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The script under test. The Red stub run points this at a stub. */
export const SCRIPT =
  process.env.AFFECTED_APPS_SCRIPT ?? join(ROOT, "scripts", "ci", "affected-apps.mjs");

/** The four workspace globs of the contract assumption C3. */
export const WORKSPACE_GLOBS = ["apps/*", "packages/*", "packages/integrations/*", "services/*"];

/** The base of every scratch folder. */
const SCRATCH_BASE = existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();

/** The scratch folders that the tests created. */
const scratchDirs = new Set();

/** The home folders that the helper created, keyed by repository path. */
const homeDirs = new Map();

/** The 10 rows of the app table of spec section 2a. */
export const TABLE_ROWS = [
  {
    id: "www-reading-advantage",
    path: "apps/www-reading-advantage",
    service: "www-reading-advantage",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/www-reading-advantage/cloudbuild.yaml",
    mode: "direct",
    tagPrefix: "",
  },
  {
    id: "primary-advantage",
    path: "apps/primary-advantage",
    service: "primary-advantage-app",
    project: "primary-advantage",
    region: "asia-southeast1",
    cloudbuild: "apps/primary-advantage/cloudbuild.yaml",
    mode: "direct",
    tagPrefix: "",
  },
  {
    id: "storytime",
    path: "apps/storytime",
    service: "storytime-app",
    project: "primary-advantage",
    region: "asia-southeast1",
    cloudbuild: "apps/storytime/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "st",
    tag: "st-${BUILD_ID:0:8}",
    tagLength: 11,
  },
  {
    id: "accounting",
    path: "apps/accounting",
    service: "accounting",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/accounting/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "candidate",
    tag: "candidate",
    tagLength: 9,
  },
  {
    id: "codecamp-advantage",
    path: "apps/codecamp-advantage",
    service: "codecamp-advantage",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/codecamp-advantage/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "sso-candidate",
    tag: "sso-candidate",
    tagLength: 13,
  },
  {
    id: "marketing",
    path: "apps/marketing",
    service: "marketing",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/marketing/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "c",
    tag: "c${BUILD_ID:0:8}",
    tagLength: 9,
  },
  {
    id: "sales-advantage",
    path: "apps/sales-advantage",
    service: "sales-advantage",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/sales-advantage/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "legacy-rollback",
    tag: "legacy-rollback",
    tagLength: 15,
  },
  {
    id: "accounts",
    path: "apps/accounts",
    service: "accounts",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/accounts/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "ac",
    tag: "ac-${BUILD_ID:0:8}",
    tagLength: 11,
  },
  {
    id: "workbooks",
    path: "apps/workbooks",
    service: "workbooks",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/workbooks/cloudbuild.yaml",
    mode: "gated",
    tagPrefix: "wb",
    tag: "wb-${BUILD_ID:0:8}",
    tagLength: 11,
  },
  {
    id: "reading-advantage",
    path: "apps/reading-advantage",
    service: "reading-advantage-web",
    project: "$PROJECT_ID",
    region: "asia-southeast1",
    cloudbuild: "apps/reading-advantage/cloudbuild.yaml",
    mode: "excluded",
    tagPrefix: "",
  },
];

/**
 * Build the environment of a hermetic git call.
 *
 * The environment holds no `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, or
 * `GIT_PREFIX`. It sets `HOME`, `GIT_CONFIG_GLOBAL`, and `GIT_CONFIG_NOSYSTEM`.
 * It sets `gc.auto` to 0 and `maintenance.auto` to false. A git call then starts
 * no maintenance in the background.
 *
 * @param {string} home The home folder of the call.
 * @returns {Record<string, string>} The environment of the call.
 */
export function gitEnv(home) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_CONFIG_")) delete env[key];
  }
  for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX"]) {
    delete env[key];
  }
  env.HOME = home;
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_COUNT = "2";
  env.GIT_CONFIG_KEY_0 = "gc.auto";
  env.GIT_CONFIG_VALUE_0 = "0";
  env.GIT_CONFIG_KEY_1 = "maintenance.auto";
  env.GIT_CONFIG_VALUE_1 = "false";
  return env;
}

/**
 * Get the home folder of a scratch repository and create it once.
 *
 * @param {string} dir The scratch repository path.
 * @returns {string} The home folder path.
 */
export function homeFor(dir) {
  const cached = homeDirs.get(dir);
  if (cached) return cached;
  const home = join(SCRATCH_BASE, `home-${basename(dir)}-${homeDirs.size}`);
  mkdirSync(home, { recursive: true });
  homeDirs.set(dir, home);
  scratchDirs.add(home);
  return home;
}

/**
 * Run a git command inside a scratch repository.
 *
 * @param {string} dir The scratch repository path.
 * @param {string[]} args The git arguments.
 * @param {{ input?: string }} [options] The standard input of the call.
 * @returns {{ status: number | null, stdout: string, stderr: string }} The result of the call.
 */
export function git(dir, args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: dir,
    env: gitEnv(homeFor(dir)),
    encoding: "utf8",
    input: options.input,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Write a map of relative paths to text into a folder.
 *
 * @param {string} dir The folder that holds the files.
 * @param {Record<string, string>} files The relative path and text of every file.
 * @returns {void}
 */
export function writeFiles(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

/**
 * Build a scratch git repository with one commit.
 *
 * @param {Record<string, string>} files The relative path and text of every file.
 * @returns {{ dir: string, sha: string }} The folder and the commit of the repository.
 */
export function makeRepo(files) {
  const dir = mkdtempSync(join(SCRATCH_BASE, "affected-"));
  scratchDirs.add(dir);
  git(dir, ["init", "-q", "-b", "master"]);
  git(dir, ["config", "user.name", "Measure Red"]);
  git(dir, ["config", "user.email", "measure-red@example.invalid"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  writeFiles(dir, files);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "base"]);
  const sha = git(dir, ["rev-parse", "HEAD"]).stdout.trim();
  return { dir, sha };
}

/**
 * Apply a change to a scratch repository and commit it.
 *
 * @param {string} dir The scratch repository path.
 * @param {{ write?: Record<string, string>, delete?: string[], move?: [string, string][] }} changes The change.
 * @returns {string} The commit of the change.
 */
export function commitChanges(dir, changes) {
  for (const [path, content] of Object.entries(changes.write ?? {})) {
    const target = join(dir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  for (const path of changes.delete ?? []) {
    rmSync(join(dir, path), { force: true });
  }
  for (const [from, to] of changes.move ?? []) {
    const target = join(dir, to);
    mkdirSync(dirname(target), { recursive: true });
    git(dir, ["mv", from, to]);
  }
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "change"]);
  return git(dir, ["rev-parse", "HEAD"]).stdout.trim();
}

/**
 * Point the fake origin of a scratch repository at a commit.
 *
 * @param {string} dir The scratch repository path.
 * @param {string} sha The commit of the fake origin.
 * @returns {void}
 */
export function setOriginMaster(dir, sha) {
  git(dir, ["update-ref", "refs/remotes/origin/master", sha]);
}

/**
 * Build a commit that has no parent and no common ancestor with the branch.
 *
 * @param {string} dir The scratch repository path.
 * @returns {string} The commit of the unrelated root.
 */
export function unrelatedRootCommit(dir) {
  const tree = git(dir, ["write-tree"]).stdout.trim();
  const sha = git(dir, ["commit-tree", tree, "-m", "unrelated root"]).stdout.trim();
  return sha;
}

/**
 * Count the changed files of a range.
 *
 * @param {string} dir The scratch repository path.
 * @param {string} base The base commit.
 * @param {string} head The head commit.
 * @returns {number} The number of changed files.
 */
export function changedFileCount(dir, base, head) {
  const result = git(dir, ["diff", "--name-only", "--no-renames", "-z", base, head]);
  const parts = result.stdout.split("\0").filter((part) => part !== "");
  return parts.length;
}

/**
 * Run the script under test with the given arguments.
 *
 * @param {string} cwd The folder that holds the scratch repository.
 * @param {string[]} args The arguments of the script.
 * @returns {{ status: number | null, stdout: string, stderr: string }} The result of the call.
 */
export function runScriptArgs(cwd, args) {
  if (!existsSync(SCRIPT)) {
    throw new Error("Missing scripts/ci/affected-apps.mjs");
  }
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    env: gitEnv(homeFor(cwd)),
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Run the script under test on a range.
 *
 * @param {string} cwd The folder that holds the scratch repository.
 * @param {string} base The base commit.
 * @param {string} head The head commit.
 * @returns {{ status: number | null, stdout: string, stderr: string }} The result of the call.
 */
export function runScript(cwd, base, head) {
  return runScriptArgs(cwd, ["--base", base, "--head", head]);
}

/**
 * Assert that a list holds at least one item.
 *
 * @param {unknown[]} list The list to check.
 * @param {string} label The label of the check.
 * @returns {void}
 * @throws {Error} When the list is empty.
 */
export function requireNonEmpty(list, label) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${label}: the list must not be empty`);
  }
}

/**
 * Assert that a result holds the expected app ids.
 *
 * The check runs in this order: the expected list must not be empty when a list is
 * expected, an empty result needs at least one changed file, the exit code must be
 * 0, stdout must hold one JSON line, and every expected id must be in the result.
 *
 * @param {{ status: number | null, stdout: string, stderr: string }} result The result of the script.
 * @param {string[]} expected The expected app ids.
 * @param {string} label The label of the check.
 * @param {number} [changedFiles] The number of changed files of the range.
 * @returns {string[]} The parsed app ids.
 * @throws {Error} When the result does not hold the expected app ids.
 */
export function expectIds(result, expected, label, changedFiles) {
  const sorted = [...expected].sort();
  if (sorted.length > 0) {
    requireNonEmpty(sorted, `${label} rows=${sorted.length}`);
  }
  if (sorted.length === 0) {
    if (!Number.isInteger(changedFiles) || changedFiles < 1) {
      throw new Error(
        `${label} changed_files=${changedFiles}: an empty result needs a range with at least 1 changed file`,
      );
    }
  }
  if (result.status !== 0) {
    throw new Error(
      `${label}: expected exit 0, got ${result.status}; stderr=${result.stderr.trim()}`,
    );
  }
  const expectedStdout = `${JSON.stringify(sorted)}\n`;
  if (result.stdout !== expectedStdout) {
    throw new Error(
      `${label}: stdout differs; expected=${JSON.stringify(expectedStdout)} actual=${JSON.stringify(result.stdout)}`,
    );
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
    throw new Error(`${label}: stdout is not an array of strings`);
  }
  for (const id of sorted) {
    if (!parsed.includes(id)) {
      throw new Error(`${label}: the id ${id} is missing from the result`);
    }
  }
  return parsed;
}

/**
 * Assert that the script refused a range.
 *
 * @param {{ status: number | null, stdout: string, stderr: string }} result The result of the script.
 * @param {string} label The label of the check.
 * @returns {void}
 * @throws {Error} When the script did not refuse the range.
 */
export function expectRefusal(result, label) {
  if (result.status !== 2) {
    throw new Error(`${label}: expected exit 2, got ${result.status}; stderr=${result.stderr.trim()}`);
  }
  if (result.stdout !== "") {
    throw new Error(`${label}: expected no stdout, got ${JSON.stringify(result.stdout)}`);
  }
  const stderr = result.stderr.trim();
  if (stderr === "" || stderr.includes("\n")) {
    throw new Error(`${label}: expected one stderr line, got ${JSON.stringify(result.stderr)}`);
  }
}

/**
 * Build the table of the app rows as JSON text.
 *
 * @param {Record<string, unknown>[]} rows The rows of the table.
 * @returns {string} The JSON text of the table.
 */
export function tableText(rows) {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

/**
 * Build the fixture table of the 10 rows of spec section 2a.
 *
 * The Red tests never copy the real table. The real table does not exist before Green.
 *
 * @returns {string} The JSON text of the table.
 */
export function fixtureTable() {
  return tableText(TABLE_ROWS);
}

/**
 * Read the real workspace files of the repository.
 *
 * The result holds the root build inputs, the `package.json` of every package of the
 * four workspace globs, and the fixture table.
 *
 * @returns {Record<string, string>} The relative path and text of every file.
 */
export function realWorkspaceFiles() {
  const files = {};
  for (const name of [
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    ".pnpmfile.cjs",
    ".dockerignore",
    "pnpm-lock.yaml",
  ]) {
    files[name] = readFileSync(join(ROOT, name), "utf8");
  }
  for (const manifest of workspaceManifestPaths()) {
    files[manifest] = readFileSync(join(ROOT, manifest), "utf8");
  }
  files["scripts/ci/apps.json"] = fixtureTable();
  return files;
}

/**
 * List the `package.json` of every package of the four workspace globs.
 *
 * @returns {string[]} The relative path of every manifest.
 */
export function workspaceManifestPaths() {
  const paths = [];
  for (const glob of WORKSPACE_GLOBS) {
    const parts = glob.split("/");
    const folder = join(ROOT, ...parts.slice(0, -1));
    if (!existsSync(folder)) continue;
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = [...parts.slice(0, -1), entry.name, "package.json"].join("/");
      if (existsSync(join(ROOT, manifest))) paths.push(manifest);
    }
  }
  return paths.sort();
}

/**
 * Build the source files that the workspace fixture needs at its base commit.
 *
 * @returns {Record<string, string>} The relative path and text of every file.
 */
export function workspaceSeedFiles() {
  const oldFile = Array.from(
    { length: 25 },
    (_, index) => `export const line${index} = ${index};`,
  ).join("\n");
  return {
    "apps/www-reading-advantage/src/app/page.tsx":
      "export default function Page() {\n  return null;\n}\n",
    "apps/www-reading-advantage/src/x.ts": "export const x = 1;\n",
    "apps/storytime/app/page.tsx": "export default function Page() {\n  return null;\n}\n",
    "apps/storytime/app/old.ts": `${oldFile}\n`,
    "apps/storytime/docs/note.md": "# storytime note\n",
    "apps/science-advantage/app/page.tsx": "export default function Page() {\n  return null;\n}\n",
    "apps/reading-advantage/app/page.tsx": "export default function Page() {\n  return null;\n}\n",
    "packages/read-along/src/index.ts": "export const readAlong = true;\n",
    "packages/utils/src/index.ts": "export const utils = true;\n",
    "packages/utils/measure/x.ts": "export const measurement = true;\n",
    "packages/config/src/index.ts": "export const config = true;\n",
    "packages/integrations/github/src/index.ts": "export const github = true;\n",
    "services/worker/src/index.ts": "export const worker = true;\n",
  };
}

/**
 * Build the synthetic workspace of the lockfile cases.
 *
 * The workspace holds the apps `alpha`, `beta`, `gamma`, and `delta`, the packages
 * `p1`, `p2`, and `p3`, and a handwritten lockfile in the format of the real one.
 *
 * @param {{ apps?: Record<string, Record<string, Record<string, string>>>, packages?: Record<string, Record<string, Record<string, string>>>, overrides?: Record<string, string> }} [config] The shape of the workspace.
 * @returns {Record<string, string>} The relative path and text of every file.
 */
export function syntheticWorkspace(config = {}) {
  const apps = config.apps ?? defaultSyntheticApps();
  const packages = config.packages ?? defaultSyntheticPackages();
  const overrides = config.overrides ?? { "ansi-styles": "6.2.1", zod: "3.25.76" };
  const files = {};
  const appIds = Object.keys(apps);
  const packageIds = Object.keys(packages);
  const packagePaths = {};
  for (const id of packageIds) packagePaths[`@fixture/${id}`] = `packages/${id}`;

  files["package.json"] = `${JSON.stringify(
    { name: "fixture-root", version: "0.0.0", private: true },
    null,
    2,
  )}\n`;
  files["turbo.json"] = `${JSON.stringify({ tasks: {} }, null, 2)}\n`;
  files[".pnpmfile.cjs"] = "module.exports = {};\n";
  files[".dockerignore"] = "node_modules\n";
  files["pnpm-workspace.yaml"] = `packages:\n${WORKSPACE_GLOBS.map((glob) => `  - "${glob}"`).join("\n")}\n`;

  for (const id of appIds) {
    files[`apps/${id}/package.json`] = `${JSON.stringify(
      { name: id, version: "0.0.0", private: true, ...apps[id] },
      null,
      2,
    )}\n`;
    files[`apps/${id}/src/index.ts`] = `export const ${id} = true;\n`;
  }
  for (const id of packageIds) {
    files[`packages/${id}/package.json`] = `${JSON.stringify(
      { name: `@fixture/${id}`, version: "0.0.0", private: true, ...packages[id] },
      null,
      2,
    )}\n`;
    files[`packages/${id}/src/index.ts`] = `export const ${id} = true;\n`;
  }

  files["scripts/ci/apps.json"] = tableText(
    [...appIds].sort().map((id) => ({
      id,
      path: `apps/${id}`,
      service: id,
      project: "$PROJECT_ID",
      region: "asia-southeast1",
      cloudbuild: `apps/${id}/cloudbuild.yaml`,
      mode: "direct",
      tagPrefix: "",
    })),
  );

  files["pnpm-lock.yaml"] = syntheticLockfile({ apps, packages, overrides, packagePaths });
  return files;
}

/**
 * Build the default app manifests of the synthetic workspace.
 *
 * @returns {Record<string, Record<string, Record<string, string>>>} The manifests of the apps.
 */
export function defaultSyntheticApps() {
  return {
    alpha: { dependencies: { chalk: "5.3.0", "@fixture/p1": "workspace:*", zod: "3.25.76" } },
    beta: { dependencies: { zod: "3.25.76" }, devDependencies: { "@fixture/p1": "workspace:*" } },
    gamma: { peerDependencies: { "@fixture/p2": "workspace:*" } },
    delta: { dependencies: { react: "19.2.9" } },
  };
}

/**
 * Build the default package manifests of the synthetic workspace.
 *
 * @returns {Record<string, Record<string, Record<string, string>>>} The manifests of the packages.
 */
export function defaultSyntheticPackages() {
  return {
    p1: { dependencies: { "@fixture/p2": "workspace:*" } },
    p2: { dependencies: { "@fixture/p3": "workspace:*" } },
    p3: { dependencies: {} },
  };
}

/**
 * Build the handwritten lockfile of the synthetic workspace.
 *
 * @param {{ apps: Record<string, Record<string, Record<string, string>>>, packages: Record<string, Record<string, Record<string, string>>>, overrides: Record<string, string>, packagePaths: Record<string, string> }} shape The shape of the workspace.
 * @returns {string} The text of the lockfile.
 */
export function syntheticLockfile(shape) {
  const lines = [];
  lines.push("lockfileVersion: '9.0'");
  lines.push("");
  lines.push("settings:");
  lines.push("  autoInstallPeers: true");
  lines.push("  excludeLinksFromLockfile: false");
  lines.push("");
  lines.push("catalogs:");
  lines.push("  default:");
  lines.push("    zod:");
  lines.push("      specifier: ^3.25.76");
  lines.push("      version: 3.25.76");
  lines.push("");
  lines.push("overrides:");
  for (const [name, version] of Object.entries(shape.overrides)) {
    lines.push(`  ${name}: ${version}`);
  }
  lines.push("");
  lines.push("pnpmfileChecksum: sha512-fixture-root");
  lines.push("");
  lines.push("importers:");
  lines.push("");

  const importers = [
    ...Object.entries(shape.apps).map(([id, deps]) => [`apps/${id}`, deps]),
    ...Object.entries(shape.packages).map(([id, deps]) => [`packages/${id}`, deps]),
  ];
  for (const [path, deps] of importers) {
    lines.push(`  ${path}:`);
    let wrote = false;
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      const entries = deps[field];
      if (!entries || Object.keys(entries).length === 0) continue;
      wrote = true;
      lines.push(`    ${field}:`);
      for (const [name, specifier] of Object.entries(entries)) {
        lines.push(`      ${name}:`);
        if (specifier === "workspace:*") {
          lines.push("        specifier: workspace:*");
          lines.push(`        version: link:${relative(path, shape.packagePaths[name])}`);
        } else {
          lines.push(`        specifier: ^${specifier}`);
          lines.push(`        version: ${specifier}`);
        }
      }
    }
    if (!wrote) lines.push("    dependencies: {}");
    lines.push("");
  }

  lines.push("packages:");
  lines.push("");
  lines.push("  ansi-styles@6.2.1:");
  lines.push("    resolution: {integrity: sha512-fixture-ansi-styles}");
  lines.push("");
  lines.push("  chalk@5.3.0:");
  lines.push("    resolution: {integrity: sha512-fixture-chalk}");
  lines.push("    dependencies:");
  lines.push("      ansi-styles: 6.2.1");
  lines.push("");
  lines.push("  react@19.2.9:");
  lines.push("    resolution: {integrity: sha512-fixture-react}");
  lines.push("");
  lines.push("  zod@3.25.76:");
  lines.push("    resolution: {integrity: sha512-fixture-zod}");
  lines.push("");
  lines.push("snapshots:");
  lines.push("");
  lines.push("  ansi-styles@6.2.1: {}");
  lines.push("");
  lines.push("  chalk@5.3.0(ansi-styles@6.2.1):");
  lines.push("    dependencies:");
  lines.push("      ansi-styles: 6.2.1");
  lines.push("");
  lines.push("  react@19.2.9: {}");
  lines.push("");
  lines.push("  zod@3.25.76: {}");
  lines.push("");
  return lines.join("\n");
}

/**
 * Remove every scratch folder that the tests created.
 *
 * @returns {void}
 */
export function removeScratchDirs() {
  for (const dir of scratchDirs) {
    rmSync(dir, { force: true, recursive: true });
  }
  scratchDirs.clear();
  homeDirs.clear();
}

/**
 * Record a folder that a test file creates so `removeScratchDirs` removes it.
 *
 * A test that builds a folder itself, for example a shallow clone next to its
 * scratch repository, calls this function with the folder path.
 *
 * @param {string} dir The folder path.
 * @returns {void}
 */
export function recordScratchDir(dir) {
  scratchDirs.add(dir);
}
