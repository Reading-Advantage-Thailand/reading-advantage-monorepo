#!/usr/bin/env tsx
/**
 * The live traffic guard of the Storytime app (track storytime_app_rebuild_20261025, plan task
 * 6.2, round 4b).
 *
 * PM decision, 2026-11-14: a live deploy (a traffic move) must fail while the service still
 * holds a review switch, and the live deploy uses `--remove-env-vars`. PM decision, 2026-11-14
 * (task 7.7): "Teacher routes off on live on 11-20: YES." The review switches are
 * `STORYTIME_REVIEW_DRAFT_WEEKS`, `STORYTIME_SHOW_DRAFT_MEDIA`, and `STORYTIME_TEACHER_ROUTES`.
 *
 * The guard is a script, not a runbook line, because two older tests forbid the switch names in
 * the runbooks (`apps/storytime/__tests__/look-adversarial-runbook-scan.test.ts`) and in the
 * build files (`apps/storytime/__tests__/look-draft-week-switch.test.ts`, row (f)). The deploy
 * runbook `docs/runbooks/storytime-deploy.md` calls this script in step 4, before its
 * `update-traffic` command, and holds no switch name.
 *
 * The command line reads only the describe documents: two `--format=json` outputs of read-only
 * `gcloud describe` commands, or the two JSON files that hold them. The output names only the
 * switch names that it found. It never prints an environment value or a `valueFrom` reference.
 * The script runs no write command and moves no traffic.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** One environment entry of a Cloud Run revision or of a service template. */
export interface GuardEnvEntry {
  name: string;
  value?: string;
  valueFrom?: unknown;
}

/** The result of the guard. */
export interface GuardResult {
  ok: boolean;
  message: string;
}

/** The input of the guard. */
export interface GuardInput {
  revisionEnv: GuardEnvEntry[];
  templateEnv: GuardEnvEntry[];
}

/**
 * The review switches that the guard covers. The PM may extend this list. The teacher routes
 * flag joined it on 2026-11-14 (PM decision, task 7.7): a revision or a template that still
 * holds it must not take the release traffic.
 */
export const REVIEW_SWITCH_NAMES: readonly string[] = [
  "STORYTIME_REVIEW_DRAFT_WEEKS",
  "STORYTIME_SHOW_DRAFT_MEDIA",
  "STORYTIME_TEACHER_ROUTES",
];

/** The Google Cloud project of the Storytime service. */
const GCLOUD_PROJECT = "primary-advantage";

/** The Google Cloud region of the Storytime service. */
const GCLOUD_REGION = "asia-southeast1";

/** The Cloud Run service name of the Storytime app. */
const GCLOUD_SERVICE = "storytime-app";

/**
 * Builds the `--remove-env-vars` argument of the live deploy from the switch names.
 * @param names The environment names to remove.
 * @returns The whole argument, for example `--remove-env-vars=A,B`.
 * @throws When the name list is empty.
 */
export function removeEnvVarsArg(names: readonly string[]): string {
  if (names.length === 0) {
    throw new Error("removeEnvVarsArg: the name list is empty");
  }
  return `--remove-env-vars=${names.join(",")}`;
}

/**
 * Reads one container as a list of environment entries.
 * @param container The container value of a describe document.
 * @returns The environment entries, in document order. A missing or invalid list gives `[]`.
 */
function envListOf(container: unknown): GuardEnvEntry[] {
  if (typeof container !== "object" || container === null) return [];
  const raw = (container as Record<string, unknown>).env;
  if (!Array.isArray(raw)) return [];
  const entries: GuardEnvEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.name !== "string") continue;
    const entry: GuardEnvEntry = { name: record.name };
    if (typeof record.value === "string") entry.value = record.value;
    if (record.valueFrom !== undefined && record.valueFrom !== null) {
      entry.valueFrom = record.valueFrom;
    }
    entries.push(entry);
  }
  return entries;
}

/**
 * Reads the first container of a containers list.
 * @param containers The containers value, or anything else.
 * @returns The environment entries of the first container.
 */
function envOfContainers(containers: unknown): GuardEnvEntry[] {
  if (!Array.isArray(containers) || containers.length === 0) return [];
  return envListOf(containers[0]);
}

/**
 * Reads a path of plain keys.
 * @param value The start value.
 * @param keys The keys, in order.
 * @returns The value at the path, or undefined when a key is missing.
 */
function at(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Reads the environment of a revision describe document.
 * @param doc The `--format=json` output of `gcloud run revisions describe`.
 * @returns The environment entries of the first container. A missing environment gives `[]`.
 */
export function envOfRevision(doc: unknown): GuardEnvEntry[] {
  return envOfContainers(at(doc, "spec", "containers"));
}

/**
 * Reads the environment of a service describe document.
 * @param doc The `--format=json` output of `gcloud run services describe`.
 * @returns The environment entries of the first container of the template. A missing
 *   environment gives `[]`.
 */
export function envOfService(doc: unknown): GuardEnvEntry[] {
  return envOfContainers(at(doc, "spec", "template", "spec", "containers"));
}

/**
 * Lists the switch names that one environment list holds.
 * @param entries The environment entries.
 * @returns The switch names, in entry order. Any value, an empty value, or a `valueFrom`
 *   counts as a hit.
 */
function hitsOf(entries: GuardEnvEntry[]): string[] {
  return entries
    .filter((entry) => REVIEW_SWITCH_NAMES.includes(entry.name))
    .map((entry) => entry.name);
}

/**
 * Checks the environment of the target revision and of the service template before a traffic
 * move. The check fails while either list still holds a review switch, with any value, an
 * empty value, or a `valueFrom` reference.
 * @param input The environment of the target revision and of the service template.
 * @returns The check result. The message names only the switch names that it found.
 */
export function checkLiveTrafficGuard(input: GuardInput): GuardResult {
  const revisionHits = hitsOf(input.revisionEnv);
  const templateHits = hitsOf(input.templateEnv);
  if (revisionHits.length === 0 && templateHits.length === 0) {
    return { ok: true, message: "live traffic guard: no review switch in the revision or the service" };
  }
  const parts: string[] = [];
  if (revisionHits.length > 0) parts.push(`the revision holds ${revisionHits.join(", ")}`);
  if (templateHits.length > 0) parts.push(`the service still has ${templateHits.join(", ")}`);
  return { ok: false, message: `live traffic guard failed: ${parts.join("; ")}` };
}

/** One read of a JSON document: the parsed value, or a failure reason. */
type JsonRead = { ok: true; value: unknown } | { ok: false; message: string };

/**
 * Reads and parses one JSON file.
 * @param path The file path.
 * @returns The parsed value, or a failure reason. The reason holds no file content.
 */
function readJson(path: string): JsonRead {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return { ok: false, message: `live traffic guard: cannot read the file ${path}` };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, message: `live traffic guard: the file ${path} holds no JSON` };
  }
}

/**
 * Runs the describe of one Cloud Run object through read-only gcloud.
 * @param kind The object kind: `revision` or `service`.
 * @param name The revision name, or the service name.
 * @returns The parsed describe document, or a failure reason.
 */
function describeJson(kind: "revision" | "service", name: string): JsonRead {
  const args =
    kind === "revision"
      ? ["run", "revisions", "describe", name]
      : ["run", "services", "describe", name];
  args.push("--project", GCLOUD_PROJECT, "--region", GCLOUD_REGION, "--format=json");
  const run = spawnSync("gcloud", args, { encoding: "utf8", timeout: 60_000 });
  if (run.error !== undefined || run.status !== 0) {
    return {
      ok: false,
      message: `live traffic guard: the read-only describe of the ${kind} failed (exit ${run.status ?? "none"})`,
    };
  }
  try {
    return { ok: true, value: JSON.parse(run.stdout) as unknown };
  } catch {
    return { ok: false, message: `live traffic guard: the describe of the ${kind} printed no JSON` };
  }
}

/**
 * Checks the structure of one describe document. The check is a separate step of the guard: the
 * lenient readers `envOfRevision` and `envOfService` turn a malformed document into `[]`, and an
 * empty list looks clean, so `judge` rejects a malformed document before it reads the environment
 * (B601, fail closed).
 * @param doc The describe document.
 * @param kind The document kind: `revision` or `service`.
 * @returns The failure reason, or `null` when the structure is valid. The reason holds no
 *   environment value, no `valueFrom` reference, and no file content.
 */
function structureReasonOf(doc: unknown, kind: "revision" | "service"): string | null {
  const label = kind === "revision" ? "the revision describe document" : "the service describe document";
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    return `live traffic guard: ${label} is not a JSON object`;
  }
  const spec = at(doc, "spec");
  if (typeof spec !== "object" || spec === null || Array.isArray(spec)) {
    return `live traffic guard: ${label} holds no spec object`;
  }
  const containers =
    kind === "revision" ? at(spec, "containers") : at(spec, "template", "spec", "containers");
  if (!Array.isArray(containers)) {
    return `live traffic guard: ${label} holds no containers list`;
  }
  if (containers.length === 0) {
    return `live traffic guard: ${label} holds no container`;
  }
  const container = containers[0];
  if (typeof container !== "object" || container === null || Array.isArray(container)) {
    return `live traffic guard: ${label} holds a first container that is not an object`;
  }
  const record = container as Record<string, unknown>;
  if (record.env === undefined) return null;
  if (!Array.isArray(record.env)) {
    return `live traffic guard: ${label} holds a container whose env is not a list`;
  }
  for (const entry of record.env) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return `live traffic guard: ${label} holds an env entry that is not an object`;
    }
    if (typeof (entry as Record<string, unknown>).name !== "string") {
      return `live traffic guard: ${label} holds an env entry whose name is not a string`;
    }
  }
  return null;
}

/**
 * Judges the two documents and prints the result. A malformed describe document fails closed:
 * `judge` prints the structure reason of the first malformed document, prints no clean verdict,
 * and exits 1, before it reads the environment or runs `checkLiveTrafficGuard`. The check covers
 * the revision document and the service document, so the `--revision` gcloud form and the
 * `--revision-json` form both fail closed.
 * @param revisionDoc The revision describe document.
 * @param serviceDoc The service describe document.
 * @returns The exit code: 0 on a pass, 1 on a fail.
 */
function judge(revisionDoc: unknown, serviceDoc: unknown): number {
  const revisionReason = structureReasonOf(revisionDoc, "revision");
  if (revisionReason !== null) {
    console.error(revisionReason);
    return 1;
  }
  const serviceReason = structureReasonOf(serviceDoc, "service");
  if (serviceReason !== null) {
    console.error(serviceReason);
    return 1;
  }
  const result = checkLiveTrafficGuard({
    revisionEnv: envOfRevision(revisionDoc),
    templateEnv: envOfService(serviceDoc),
  });
  console.log(result.message);
  return result.ok ? 0 : 1;
}

/**
 * Prints the usage of the guard.
 */
function printUsage(): void {
  console.error(
    [
      "usage: tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision-json <file> --service-json <file>",
      "       tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision <revision name>",
      "       tsx apps/storytime/scripts/review/live-traffic-guard.ts --print-remove-arg",
    ].join("\n"),
  );
}

/**
 * Runs the guard against two JSON files.
 * @param revisionPath The path of the revision describe JSON.
 * @param servicePath The path of the service describe JSON.
 * @returns The exit code: 0 on a pass, 1 on a fail.
 */
function runWithFiles(revisionPath: string, servicePath: string): number {
  const revisionRead = readJson(revisionPath);
  if (!revisionRead.ok) {
    console.error(revisionRead.message);
    return 1;
  }
  const serviceRead = readJson(servicePath);
  if (!serviceRead.ok) {
    console.error(serviceRead.message);
    return 1;
  }
  return judge(revisionRead.value, serviceRead.value);
}

/**
 * Runs the guard against the live service and one revision through read-only gcloud.
 * @param revisionName The name of the target revision.
 * @returns The exit code: 0 on a pass, 1 on a fail.
 */
function runWithGcloud(revisionName: string): number {
  const revisionRead = describeJson("revision", revisionName);
  if (!revisionRead.ok) {
    console.error(revisionRead.message);
    return 1;
  }
  const serviceRead = describeJson("service", GCLOUD_SERVICE);
  if (!serviceRead.ok) {
    console.error(serviceRead.message);
    return 1;
  }
  return judge(revisionRead.value, serviceRead.value);
}

/**
 * The command line of the guard.
 * @param argv The process arguments.
 * @returns The exit code: 0 on a pass, 1 on a fail or on a usage error.
 */
export function main(argv: readonly string[]): number {
  const args = argv.slice(2);
  if (args.includes("--print-remove-arg")) {
    console.log(removeEnvVarsArg(REVIEW_SWITCH_NAMES));
    return 0;
  }
  const valueAfter = (flag: string): string | undefined => {
    const at2 = args.indexOf(flag);
    return at2 >= 0 ? args[at2 + 1] : undefined;
  };
  const revisionName = valueAfter("--revision");
  const revisionPath = valueAfter("--revision-json");
  const servicePath = valueAfter("--service-json");
  if (revisionName !== undefined) return runWithGcloud(revisionName);
  if (revisionPath !== undefined && servicePath !== undefined) {
    return runWithFiles(revisionPath, servicePath);
  }
  printUsage();
  return 1;
}

/** Runs the command line only when the file is the entry point, so an import runs no command. */
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv));
}
