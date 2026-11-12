// @vitest-environment node
/**
 * Red tests for the image of the intake runner of the track
 * `accounting_drive_intake_20261109` (plan task 3.3).
 *
 * The test reads the Dockerfile text and the Cloud Build text. It builds no
 * image and calls no deploy command. The bundle row runs the real bundler on
 * this machine and runs the bundled file with `--help`.
 *
 * The Dockerfile must hold exactly five stages: `base`, `deps`, `builder`,
 * `runner-bundle`, and `runner`. The web stage stays the last stage, so the
 * image default stays the Next server command and the `accounting` Cloud Run
 * service keeps serving the web app. The bundle command and the `COPY` line of
 * the web stage use the same absolute path `/app/dist/intake-runner.mjs`.
 *
 * The Cloud Build file must hold a job step for `accounting-intake-poll` and a
 * scheduler step that targets the Cloud Run Admin API run endpoint.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

/** The stage names the Dockerfile must hold. */
const EXPECTED_STAGE_NAMES = [
  "base",
  "deps",
  "builder",
  "runner-bundle",
  "runner",
] as const;
/** The seven Secret Manager references of the job step. */
const EXPECTED_JOB_SECRETS = [
  "ACCOUNTING_DATABASE_URL=ACCOUNTING_DATABASE_URL:latest",
  "STORAGE_ENDPOINT=ACCOUNTING_STORAGE_ENDPOINT:latest",
  "STORAGE_REGION=ACCOUNTING_STORAGE_REGION:latest",
  "STORAGE_BUCKET=ACCOUNTING_STORAGE_BUCKET:latest",
  "STORAGE_ACCESS_KEY=ACCOUNTING_STORAGE_ACCESS_KEY:latest",
  "STORAGE_SECRET_KEY=ACCOUNTING_STORAGE_SECRET_KEY:latest",
  "STORAGE_PUBLIC_BASE_URL=ACCOUNTING_STORAGE_PUBLIC_BASE_URL:latest",
] as const;
/** The four plain values of the job step. */
const EXPECTED_JOB_ENV_VARS = [
  "ACCOUNTING_DRIVE_FOLDER_ID",
  "ACCOUNTING_INTAKE_ACTOR_ID",
  "ACCOUNTING_DUPLICATE_SCAN_CAP",
  "ACCOUNTING_EXTRACTION_MODEL",
] as const;
/** The image of the accounting web service and of the intake job. */
const ACCOUNTING_IMAGE =
  "asia-southeast1-docker.pkg.dev/$PROJECT_ID/accounting/accounting:$BUILD_ID";
/** The Cloud Run Admin API run endpoint of the job. */
const SCHEDULER_URI =
  "https://run.googleapis.com/v2/projects/$PROJECT_ID/locations/asia-southeast1/jobs/accounting-intake-poll:run";
/** The names of the image rows of this file. */
const IMAGE_ASSERTIONS = [
  "keeps the web stage as the last stage of the Dockerfile",
  "keeps the web stage CMD as the Next server command",
  "holds exactly the five stage names base, deps, builder, runner-bundle, and runner",
  "adds exactly one new stage named runner-bundle and no new final stage",
  "bundles app/lib/intake-runner.ts into dist/intake-runner.mjs",
  "holds a full bundle command with no --packages=external",
  "uses the same absolute path for the bundle outfile and the web stage COPY source",
  "adds exactly one COPY line to the web stage and copies no node_modules for the bundle",
  "creates the Cloud Run job accounting-intake-poll on the same image with the node command",
  "puts every secret reference in --set-secrets in the NAME=SECRET_NAME:latest form",
  "puts only plain values in --set-env-vars and no :latest token",
  "starts the scheduler through the Cloud Run Admin API run endpoint with no run.app job URL",
  "holds no new grant command for the scheduler grants",
  "runs the bundled runner with --help from a scratch directory and exits 0 with no module error",
] as const;

console.log(`image_assertions=${IMAGE_ASSERTIONS.length}`);
if (IMAGE_ASSERTIONS.length < 12) {
  throw new Error(
    `image_assertions=${IMAGE_ASSERTIONS.length} is below the floor of 12.`,
  );
}
console.log(`stage_names=${EXPECTED_STAGE_NAMES.length}`);

const dockerfilePath = new URL("../../../Dockerfile", import.meta.url);
const cloudbuildPath = new URL("../../../cloudbuild.yaml", import.meta.url);
const appFolder = new URL("../../..", import.meta.url).pathname;

const dockerfile = readFileSync(dockerfilePath, "utf8");
const cloudbuild = readFileSync(cloudbuildPath, "utf8");

/**
 * Splits one shell command into its tokens, keeping a quoted token together.
 * @param command Command text.
 * @returns The tokens of the command.
 */
function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (const character of command) {
    if (quote !== null) {
      if (character === quote) {
        quote = null;
        continue;
      }
      current += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (/\s/u.test(character)) {
      if (current !== "") {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += character;
  }
  if (current !== "") tokens.push(current);
  return tokens;
}

/**
 * Counts the matches of one pattern inside one text.
 * @param text Text to scan.
 * @param pattern Pattern to count.
 * @returns The number of matches.
 */
function countMatches(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  return text.match(new RegExp(pattern.source, flags))?.length ?? 0;
}

/**
 * Reads the stage names of the Dockerfile.
 * @returns The stage names in the order of the file.
 */
function readStageNames(): string[] {
  return [...dockerfile.matchAll(/^FROM\s+\S+(?:\s+AS\s+(?<name>\S+))?\s*$/gmu)]
    .map((match) => match.groups?.name ?? "")
    .filter((name) => name !== "");
}

/**
 * Reads the text of the last stage of the Dockerfile.
 * @returns The text of the last stage.
 */
function readLastStageText(): string {
  const matches = [
    ...dockerfile.matchAll(/^FROM\s+\S+(?:\s+AS\s+\S+)?\s*$/gmu),
  ];
  const last = matches[matches.length - 1];
  if (last === undefined || last.index === undefined) return "";
  return dockerfile.slice(last.index);
}

/**
 * Reads the bundle command of the Dockerfile.
 * @returns The bundle command, or an empty string when the file holds none.
 */
function readBundleCommand(): string {
  const joined = dockerfile.replace(/\\\r?\n\s*/g, " ");
  const line = joined
    .split("\n")
    .find(
      (candidate) =>
        candidate.trimStart().startsWith("RUN") && candidate.includes("esbuild"),
    );
  return line ?? "";
}

/**
 * Reads one Cloud Build step by its id.
 * @param id The step id.
 * @returns The text of the step, or an empty string when the step is missing.
 */
function readStep(id: string): string {
  const marker = `id: "${id}"`;
  const start = cloudbuild.indexOf(marker);
  if (start === -1) return "";
  const next = cloudbuild.indexOf("\n  - name:", start);
  return next === -1 ? cloudbuild.slice(start) : cloudbuild.slice(start, next);
}

/**
 * Reads one flag value out of a command.
 * @param command Command text.
 * @param flag The flag name.
 * @returns The flag value, or undefined.
 */
function readFlagValue(command: string, flag: string): string | undefined {
  const pattern = new RegExp(`${flag}=(?<value>\\S+)`, "u");
  return pattern.exec(command)?.groups?.value;
}

const stageNames = readStageNames();
const lastStageText = readLastStageText();
const bundleCommand = readBundleCommand();
const jobStep = readStep("deploy-intake-job");
const schedulerStep = readStep("schedule-intake-job");
const outfilePath = readFlagValue(bundleCommand, "--outfile");
const copyLines = lastStageText
  .split("\n")
  .filter((line) => line.trimStart().startsWith("COPY"));
const bundleCopyLines = copyLines.filter((line) => line.includes("runner-bundle"));

describe("the accounting image", () => {
  it("keeps the web stage as the last stage of the Dockerfile", () => {
    expect(stageNames[stageNames.length - 1]).toBe("runner");
    expect(lastStageText).toContain("FROM node:22-alpine AS runner");
  });

  it("keeps the web stage CMD as the Next server command", () => {
    expect(lastStageText).toContain(
      'CMD ["node", "apps/accounting/server.js"]',
    );
  });

  it("holds exactly the five stage names base, deps, builder, runner-bundle, and runner", () => {
    expect(stageNames).toEqual([...EXPECTED_STAGE_NAMES]);
    expect(new Set(stageNames).size).toBe(EXPECTED_STAGE_NAMES.length);
  });

  it("adds exactly one new stage named runner-bundle and no new final stage", () => {
    expect(stageNames.filter((name) => name === "runner-bundle").length).toBe(1);
    expect(stageNames.filter((name) => name === "runner").length).toBe(1);
    expect(stageNames[stageNames.length - 1]).not.toBe("runner-bundle");
  });

  it("bundles app/lib/intake-runner.ts into dist/intake-runner.mjs", () => {
    expect(bundleCommand).not.toBe("");
    expect(bundleCommand).toContain("app/lib/intake-runner.ts");
    expect(bundleCommand).toContain("dist/intake-runner.mjs");
  });

  it("holds a full bundle command with no --packages=external", () => {
    expect(bundleCommand).toContain("--bundle");
    expect(bundleCommand).toContain("--platform=node");
    expect(bundleCommand).toContain("--format=esm");
    expect(bundleCommand).toContain("--target=node22");
    expect(bundleCommand).toContain("--banner:js=");
    expect(bundleCommand).toContain("createRequire");
    expect(bundleCommand).not.toContain("--packages=external");
  });

  it("uses the same absolute path for the bundle outfile and the web stage COPY source", () => {
    expect(outfilePath).toBe("/app/dist/intake-runner.mjs");
    expect(bundleCopyLines.length).toBe(1);
    const source = /COPY\s+--from=runner-bundle\s+(?:--chown=\S+\s+)?(?<source>\S+)/u.exec(
      bundleCopyLines[0] ?? "",
    )?.groups?.source;
    expect(source).toBe("/app/dist/intake-runner.mjs");
    expect(bundleCopyLines[0]).toContain("./dist/intake-runner.mjs");
  });

  it("adds exactly one COPY line to the web stage and copies no node_modules for the bundle", () => {
    expect(bundleCopyLines.length).toBe(1);
    expect(
      copyLines.filter((line) => line.includes("node_modules")).length,
    ).toBe(0);
    expect(bundleCopyLines[0]).toContain("--chown=nextjs:nodejs");
  });

  it("creates the Cloud Run job accounting-intake-poll on the same image with the node command", () => {
    expect(jobStep).not.toBe("");
    expect(jobStep).toContain("accounting-intake-poll");
    expect(jobStep).toContain(ACCOUNTING_IMAGE);
    expect(jobStep).toContain("--region=asia-southeast1");
    expect(jobStep).toContain(
      "--service-account=accounting-cloud-run@$PROJECT_ID.iam.gserviceaccount.com",
    );
    expect(jobStep).toContain("--command=node");
    expect(jobStep).toContain("--args=dist/intake-runner.mjs");
  });

  it("puts every secret reference in --set-secrets in the NAME=SECRET_NAME:latest form", () => {
    const secrets = /--set-secrets=(?<value>[^"\n]+)/u
      .exec(jobStep)
      ?.groups?.value;
    expect(secrets).toBeDefined();
    const entries = (secrets ?? "").split(",").map((entry) => entry.trim());
    expect(entries.length).toBe(EXPECTED_JOB_SECRETS.length);
    expect([...entries].sort()).toEqual([...EXPECTED_JOB_SECRETS].sort());
    for (const entry of entries) {
      expect(entry).toMatch(/^[A-Z0-9_]+=[A-Z0-9_]+:latest$/u);
    }
  });

  it("puts only plain values in --set-env-vars and no :latest token", () => {
    const envVars = /--set-env-vars=(?<value>[^"\n]+)/u
      .exec(jobStep)
      ?.groups?.value;
    expect(envVars).toBeDefined();
    expect(envVars).not.toContain(":latest");
    const names = (envVars ?? "")
      .split(",")
      .map((entry) => entry.trim().split("=")[0] ?? "")
      .filter((name) => name !== "");
    expect(names.length).toBe(EXPECTED_JOB_ENV_VARS.length);
    expect([...names].sort()).toEqual([...EXPECTED_JOB_ENV_VARS].sort());
  });

  it("starts the scheduler through the Cloud Run Admin API run endpoint with no run.app job URL", () => {
    expect(schedulerStep).not.toBe("");
    expect(schedulerStep).toContain(SCHEDULER_URI);
    expect(schedulerStep).toContain("--http-method=POST");
    expect(schedulerStep).toContain("accounting-scheduler");
    expect(schedulerStep).toContain("--schedule=");
    expect(schedulerStep).toContain("--time-zone=");
    expect(schedulerStep).not.toContain("run.app");
  });

  it("holds no new grant command for the scheduler grants", () => {
    expect(countMatches(cloudbuild, /add-iam-policy-binding/gu)).toBe(1);
    expect(cloudbuild).toContain("--role=roles/run.invoker");
    expect(cloudbuild).toContain(
      "--member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com",
    );
  });

  it("runs the bundled runner with --help from a scratch directory and exits 0 with no module error", () => {
    expect(bundleCommand).not.toBe("");
    const tokens = tokenizeCommand(bundleCommand.replace(/^RUN\s+/u, ""));
    const esbuildIndex = tokens.indexOf("esbuild");
    expect(esbuildIndex).toBeGreaterThan(-1);
    const bundleTokens = tokens.slice(esbuildIndex + 1);
    const entry = bundleTokens.find((token) => !token.startsWith("--"));
    expect(entry).toBe("app/lib/intake-runner.ts");
    const flags = bundleTokens.filter((token) => token.startsWith("--"));
    const scratch = mkdtempSync(
      existsSync("/tmp/opencode") ? "/tmp/opencode/intake-bundle-" : join(tmpdir(), "intake-bundle-"),
    );
    try {
      const outfile = join(scratch, "dist", "intake-runner.mjs");
      const esbuild = new URL(
        "../../../../../node_modules/.bin/esbuild",
        import.meta.url,
      ).pathname;
      const bundle = spawnSync(
        esbuild,
        [
          ...(entry === undefined ? [] : [entry]),
          ...flags.filter((flag) => !flag.startsWith("--outfile=")),
          `--outfile=${outfile}`,
        ],
        { cwd: appFolder, encoding: "utf8" },
      );
      expect(
        bundle.status,
        `The bundle step failed: ${bundle.stderr ?? ""}`,
      ).toBe(0);
      const run = spawnSync("node", [outfile, "--help"], {
        env: {
          PATH: process.env.PATH ?? "",
          HOME: process.env.HOME ?? "",
          ACCOUNTING_DRIVE_FOLDER_ID: "fake-intake-folder-id",
        } as unknown as NodeJS.ProcessEnv,
        encoding: "utf8",
      });
      expect(run.status, `The dry start failed: ${run.stderr ?? ""}`).toBe(0);
      expect(run.stderr).not.toContain("Cannot find module");
      expect(run.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
      expect(run.stderr).not.toContain("ERR_DLOPEN_FAILED");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
