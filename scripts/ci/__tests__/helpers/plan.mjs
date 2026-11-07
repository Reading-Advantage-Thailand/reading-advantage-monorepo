/**
 * Plan harness for the Phase 2 Red tests of the track `per_app_cicd_20261107`.
 *
 * The harness reads the real workflows, Cloud Build files, app table, and runbooks.
 * It runs the real select step of a workflow against a scratch git repository.
 * `CICD_FIXTURE_ROOT` points the reads at a copied tree for the partial-repair proof.
 *
 * @module plan
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import {
  ROOT,
  commitChanges,
  gitEnv,
  homeFor,
  makeRepo,
  realWorkspaceFiles,
} from "./scratch.mjs";

/** The tree of the artifacts under test. */
export const FIXTURE_ROOT = process.env.CICD_FIXTURE_ROOT ?? ROOT;

/** The scratch folders of the helper. */
const planDirs = new Set();

/**
 * Get the folder for scratch files of this helper.
 *
 * @returns {string} The folder path.
 */
function scratchBase() {
  return existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir();
}

/**
 * Create a scratch folder that `removePlanScratch` removes.
 *
 * @param {string} prefix The prefix of the folder name.
 * @returns {string} The folder path.
 */
function planDir(prefix) {
  const dir = mkdtempSync(join(scratchBase(), prefix));
  planDirs.add(dir);
  return dir;
}

/**
 * Remove every scratch folder that the helper created.
 *
 * @returns {void}
 */
export function removePlanScratch() {
  for (const dir of planDirs) rmSync(dir, { force: true, recursive: true });
  planDirs.clear();
}

/**
 * Read a file of the fixture tree.
 *
 * @param {string} relativePath The repository path of the file.
 * @returns {string} The text of the file.
 * @throws {Error} When the file does not exist.
 */
export function readText(relativePath) {
  const path = join(FIXTURE_ROOT, relativePath);
  if (!existsSync(path)) throw new Error(`missing ${relativePath}`);
  return readFileSync(path, "utf8");
}

/**
 * Parse a workflow file of the fixture tree.
 *
 * @param {string} name The name of the workflow file, for example `cd-apps.yml`.
 * @returns {Record<string, unknown>} The parsed document.
 * @throws {Error} When the file does not exist.
 */
export function workflow(name) {
  const path = join(FIXTURE_ROOT, ".github", "workflows", name);
  if (!existsSync(path)) throw new Error(`Missing .github/workflows/${name}`);
  return parse(readFileSync(path, "utf8"));
}

/**
 * List the workflow files of the fixture tree.
 *
 * @returns {string[]} The file names, sorted.
 */
export function allWorkflowFiles() {
  const dir = join(FIXTURE_ROOT, ".github", "workflows");
  return readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();
}

/**
 * Parse a Cloud Build file of the fixture tree.
 *
 * @param {string} relativePath The repository path of the file.
 * @returns {{ steps?: Record<string, unknown>[] } & Record<string, unknown>} The parsed document.
 * @throws {Error} When the file does not exist.
 */
export function cloudbuild(relativePath) {
  return parse(readText(relativePath));
}

/**
 * Read the app table of the fixture tree.
 *
 * @returns {Record<string, unknown>[]} The rows of the table.
 */
export function readTable() {
  return JSON.parse(readText("scripts/ci/apps.json"));
}

/**
 * Get the gated rows of the app table.
 *
 * @returns {Record<string, unknown>[]} The gated rows.
 */
export function gatedRows() {
  return readTable().filter((row) => row.mode === "gated");
}

/**
 * Get the rows of the app table that are not excluded.
 *
 * @returns {Record<string, unknown>[]} The non-excluded rows.
 */
export function nonExcludedRows() {
  return readTable().filter((row) => row.mode !== "excluded");
}

/**
 * List every step of every job of a workflow.
 *
 * @param {Record<string, unknown>} doc The parsed workflow.
 * @returns {{ job: string, index: number, step: Record<string, unknown> }[]} The steps.
 */
export function allSteps(doc) {
  const steps = [];
  for (const [job, value] of Object.entries(doc.jobs ?? {})) {
    const jobSteps = value?.steps ?? [];
    jobSteps.forEach((step, index) => steps.push({ job, index, step }));
  }
  return steps;
}

/**
 * Get the select step of a workflow.
 *
 * @param {Record<string, unknown>} doc The parsed workflow.
 * @param {string} name The workflow file name of the error message.
 * @returns {Record<string, unknown>} The select step.
 * @throws {Error} When the workflow has no step with id `select`.
 */
export function selectStep(doc, name) {
  for (const { step } of allSteps(doc)) {
    if (step.id === "select") return step;
  }
  throw new Error(`missing select step in .github/workflows/${name}`);
}

/**
 * Join the text fields of a step.
 *
 * @param {Record<string, unknown>} step The step.
 * @returns {string} The joined text.
 */
export function stepText(step) {
  const parts = [step?.entrypoint ?? ""];
  for (const value of step?.args ?? []) parts.push(String(value));
  for (const value of stepEnv(step)) parts.push(value);
  return parts.join("\n");
}

/**
 * List the environment entries of a step as `NAME=value` text.
 *
 * A Cloud Build step holds an array of entries. A workflow step may hold a map.
 *
 * @param {Record<string, unknown>} step The step.
 * @returns {string[]} The environment entries.
 */
export function stepEnv(step) {
  const env = step?.env;
  if (Array.isArray(env)) return env.map((value) => String(value));
  if (env && typeof env === "object") {
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }
  return [];
}

/**
 * List the ids of the steps of a Cloud Build file.
 *
 * @param {{ steps?: Record<string, unknown>[] }} doc The parsed file.
 * @returns {string[]} The step ids.
 */
export function stepIds(doc) {
  return (doc.steps ?? []).map((step) => String(step.id ?? ""));
}

/**
 * Get the deploy steps of a Cloud Build file.
 *
 * @param {{ steps?: Record<string, unknown>[] }} doc The parsed file.
 * @returns {Record<string, unknown>[]} The steps whose id starts with `deploy`.
 * @throws {Error} When the file has no deploy step.
 */
export function deploySteps(doc) {
  const steps = (doc.steps ?? []).filter((step) => String(step.id ?? "").startsWith("deploy"));
  if (steps.length === 0) throw new Error("no deploy step");
  return steps;
}

/**
 * Get the first deploy step of a Cloud Build file.
 *
 * @param {{ steps?: Record<string, unknown>[] }} doc The parsed file.
 * @returns {Record<string, unknown>} The deploy step.
 */
export function deployStep(doc) {
  return deploySteps(doc)[0];
}

/** The tokens of the AC-2.10 database-step rule. */
export const DB_TOKENS = [
  "cloud-sql-proxy",
  "psql",
  "drizzle",
  "@reading-advantage/db",
  "company-identity:",
  "bootstrap:production",
];

/**
 * Apply the AC-2.10 database-step rule to a step.
 *
 * The runtime options `--set-secrets` and `--add-cloudsql-instances` are removed
 * before the scan. A step is a database step when a name in `secretEnv` holds
 * `DATABASE_URL`, or its text holds one of the database tokens.
 *
 * @param {Record<string, unknown>} step The step.
 * @returns {string | null} The matching token, or null.
 */
export function dbToken(step) {
  for (const name of step?.secretEnv ?? []) {
    if (String(name).includes("DATABASE_URL")) return "DATABASE_URL";
  }
  const text = stepText(step)
    .replace(/--set-secrets=\S*/g, "")
    .replace(/--add-cloudsql-instances=\S*/g, "");
  for (const token of DB_TOKENS) {
    if (text.includes(token)) return token;
  }
  return null;
}

/**
 * Find the database steps of a Cloud Build file.
 *
 * @param {{ steps?: Record<string, unknown>[] }} doc The parsed file.
 * @returns {{ id: string, token: string }[]} The database steps.
 */
export function databaseSteps(doc) {
  const found = [];
  for (const step of doc.steps ?? []) {
    const token = dbToken(step);
    if (token) found.push({ id: String(step.id ?? ""), token });
  }
  return found;
}

/**
 * Assert that the expected ids run in order and that the traffic move is last.
 *
 * @param {{ steps?: Record<string, unknown>[] }} doc The parsed file.
 * @param {string[]} expected The expected step ids, with the traffic move last.
 * @param {string} label The label of the check.
 * @returns {string[]} The step ids.
 * @throws {Error} When a step is missing or the order is wrong.
 */
export function ordered(doc, expected, label) {
  if (!Array.isArray(expected) || expected.length === 0) {
    throw new Error(`${label}: the expected list must not be empty`);
  }
  const ids = stepIds(doc);
  const indexes = [];
  for (const id of expected) {
    const index = ids.indexOf(id);
    if (index < 0) throw new Error(`${label}: missing step ${id} in ${ids.join(",")}`);
    indexes.push(index);
  }
  for (let i = 1; i < indexes.length; i += 1) {
    if (indexes[i] <= indexes[i - 1]) {
      throw new Error(`${label}: order is wrong; got ${ids.join(",")}`);
    }
  }
  if (expected[expected.length - 1] !== "update-traffic") {
    throw new Error(`${label}: the expected list must end with update-traffic`);
  }
  if (ids[ids.length - 1] !== "update-traffic") {
    throw new Error(`${label}: update-traffic must be the last step; got ${ids.join(",")}`);
  }
  return ids;
}

/**
 * Compute the rendered tag of a table row.
 *
 * @param {Record<string, unknown>} row The table row.
 * @returns {{ text: string, length: number }} The rendered tag and its length.
 */
export function tagFor(row) {
  const tag = String(row.tag ?? "");
  if (tag.includes("${BUILD_ID:0:8}")) {
    const text = `${row.tagPrefix}-${"x".repeat(8)}`;
    return { text, length: text.length };
  }
  if (tag.includes("build_id")) {
    const text = `c${"x".repeat(8)}`;
    return { text, length: text.length };
  }
  return { text: tag, length: tag.length };
}

/**
 * Compute the combined length of the tag and the service name of a row.
 *
 * @param {Record<string, unknown>} row The table row.
 * @returns {number} The combined length.
 */
export function combined(row) {
  return tagFor(row).length + String(row.service).length;
}

/**
 * Parse the `key=value` lines of a `GITHUB_OUTPUT` file.
 *
 * @param {string} text The text of the file.
 * @returns {Record<string, string>} The output values.
 * @throws {Error} When a line holds no `=`.
 */
export function parseOutputs(text) {
  const outputs = {};
  for (const line of String(text).split("\n")) {
    if (line === "") continue;
    const index = line.indexOf("=");
    if (index < 0) throw new Error(`GITHUB_OUTPUT line without "=": ${JSON.stringify(line)}`);
    outputs[line.slice(0, index)] = line.slice(index + 1);
  }
  return outputs;
}

/**
 * Run the select step of a workflow against a scratch repository.
 *
 * @param {string} name The workflow file name.
 * @param {string} repo The scratch repository path.
 * @param {string} base The base commit.
 * @param {string} head The head commit.
 * @returns {{ status: number | null, outputs: Record<string, string>, gcloudCalls: string[], stdout: string, stderr: string }} The result.
 */
export function runSelect(name, repo, base, head) {
  const doc = workflow(name);
  const step = selectStep(doc, name);
  const runText = String(step.run ?? "");
  if (runText === "") throw new Error(`select step in .github/workflows/${name} has no run text`);
  const dir = planDir("select-");
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  const gcloudLog = join(dir, "gcloud.log");
  const gcloud = join(bin, "gcloud");
  writeFileSync(gcloud, `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "$GCLOUD_LOG"\nexit 0\n`);
  chmodSync(gcloud, 0o755);
  const script = join(dir, "select.sh");
  writeFileSync(script, `${runText}\n`);
  const output = join(dir, "out");
  writeFileSync(output, "");
  const env = {
    ...gitEnv(homeFor(repo)),
    BASE_SHA: base,
    HEAD_SHA: head,
    GITHUB_OUTPUT: output,
    GCLOUD_LOG: gcloudLog,
    PATH: `${bin}:${process.env.PATH ?? ""}`,
  };
  const result = spawnSync("bash", ["-e", script], {
    cwd: repo,
    env,
    encoding: "utf8",
  });
  return {
    status: result.status,
    outputs: parseOutputs(existsSync(output) ? readFileSync(output, "utf8") : ""),
    gcloudCalls: existsSync(gcloudLog)
      ? readFileSync(gcloudLog, "utf8").split("\n").filter((line) => line !== "")
      : [],
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/**
 * Build the files of the scratch plan repository.
 *
 * The files are the real workspace files of `scratch.mjs`, the real app table, and
 * the real script text, all read from the fixture tree.
 *
 * @returns {Record<string, string>} The relative path and text of every file.
 */
export function realPlanFiles() {
  const files = realWorkspaceFiles();
  files["scripts/ci/apps.json"] = readText("scripts/ci/apps.json");
  files["scripts/ci/affected-apps.mjs"] = readText("scripts/ci/affected-apps.mjs");
  return files;
}

/**
 * Build a scratch repository and commit one change.
 *
 * @param {{ write?: Record<string, string>, delete?: string[], move?: [string, string][] }} changes The change.
 * @returns {{ dir: string, base: string, head: string }} The repository and its range.
 */
export function planRepo(changes) {
  if (!changes || Object.keys(changes).length === 0) {
    throw new Error("planRepo needs at least one change");
  }
  const { dir, sha } = makeRepo(realPlanFiles());
  const head = commitChanges(dir, changes);
  return { dir, base: sha, head };
}

/**
 * Get one section of a runbook.
 *
 * @param {string} text The runbook text.
 * @param {string} needle The text that the section heading holds.
 * @returns {string} The text of the section, or an empty string.
 */
export function sectionText(text, needle) {
  const lines = String(text).split("\n");
  const index = lines.findIndex((line) => /^##\s/.test(line) && line.includes(needle));
  if (index < 0) return "";
  const rest = lines.slice(index + 1);
  const end = rest.findIndex((line) => /^##\s/.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * Build the 7 checkers of the FR-4 runbook facts.
 *
 * @returns {{ label: string, test: (text: string) => boolean }[]} The checkers.
 */
export function runbookFacts() {
  return [
    {
      label: "archive-copy-set",
      test: (text) => /154 files/.test(text) && /3\s*MB/.test(text) && /COPY/.test(text),
    },
    {
      label: "media-base-env",
      test: (text) =>
        /STORYTIME_MEDIA_BASE=https:\/\/storage\.googleapis\.com\/primary-app-storage\/storytime-app/.test(
          text,
        ),
    },
    {
      label: "media-bucket",
      test: (text) => /gs:\/\/primary-app-storage\/storytime-app\//.test(text),
    },
    {
      label: "ingress",
      test: (text) => /--ingress=internal/.test(text) && /\ball\b/.test(text),
    },
    {
      label: "rejected-build-rule",
      test: (text) => /storytime-app-00008-tmb/.test(text) && /must not move|must not receive/i.test(text),
    },
    {
      label: "live-revision",
      test: (text) => /storytime-app-00011-dut/.test(text),
    },
    {
      label: "tag-limit",
      test: (text) => /46/.test(text) && /4907d929/.test(text),
    },
  ];
}
