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
 * The own build file `cloudbuild-intake-job.yaml` must hold a guard step, a job
 * step for `accounting-intake-poll`, and a scheduler step that targets the
 * Cloud Run Admin API run endpoint (plan task 3.6, PM-20, PM-21). The push file
 * `cloudbuild.yaml` must hold none of these steps. Two rows run the step scripts
 * with fake values and a stub `gcloud`, so no row calls Google Cloud.
 */
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
/** The five names of the job step plain values. Each value is `${_<NAME>}`. */
const EXPECTED_JOB_ENV_VARS = [
  "ACCOUNTING_DRIVE_FOLDER_ID",
  "ACCOUNTING_INTAKE_ACTOR_ID",
  "ACCOUNTING_INTAKE_COMPANY_ID",
  "ACCOUNTING_DUPLICATE_SCAN_CAP",
  "ACCOUNTING_EXTRACTION_MODEL",
] as const;
/** The image flag of the intake job: the image comes from a substitution. */
const JOB_IMAGE_FLAG = "--image=${_ACCOUNTING_IMAGE}";
/** The six substitution keys of the build file of the intake job. */
const SUBSTITUTION_KEYS = [
  "_ACCOUNTING_IMAGE",
  "_ACCOUNTING_DRIVE_FOLDER_ID",
  "_ACCOUNTING_INTAKE_ACTOR_ID",
  "_ACCOUNTING_INTAKE_COMPANY_ID",
  "_ACCOUNTING_DUPLICATE_SCAN_CAP",
  "_ACCOUNTING_EXTRACTION_MODEL",
] as const;
/** A fake value for each substitution key. No value is a real id or image. */
const FAKE_VALUES: Record<(typeof SUBSTITUTION_KEYS)[number], string> = {
  _ACCOUNTING_IMAGE:
    "asia-southeast1-docker.pkg.dev/fake-project/accounting/accounting:fake-tag-0001",
  _ACCOUNTING_DRIVE_FOLDER_ID: "fake-folder-id-0002",
  _ACCOUNTING_INTAKE_ACTOR_ID: "fake-actor-id-0003",
  _ACCOUNTING_INTAKE_COMPANY_ID: "fake-company-id-0004",
  _ACCOUNTING_DUPLICATE_SCAN_CAP: "4217",
  _ACCOUNTING_EXTRACTION_MODEL: "fake-model-name-0006",
};
/** The three step ids of the build file of the intake job, in order. */
const EXPECTED_INTAKE_STEP_IDS = [
  "guard-intake-values",
  "deploy-intake-job",
  "schedule-intake-job",
] as const;
/** The command tokens that grant a role. */
const GRANT_PATTERNS = [
  /add-iam-policy-binding/u,
  /set-iam-policy/u,
  /--role=/u,
  /roles\//u,
] as const;
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
  "keeps the job step and the scheduler step out of the push file",
  "holds exactly the three steps guard-intake-values, deploy-intake-job, and schedule-intake-job in the new file",
  "holds no grant command in the new file",
  "holds no substitution default for the six keys in the new file",
  "runs the guard script with fake values and rejects each empty key and a malformed scan cap",
  "runs the scheduler script with a stub gcloud for the update branch and the create branch",
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

const intakeJobPath = new URL("../../../cloudbuild-intake-job.yaml", import.meta.url);

const dockerfile = readFileSync(dockerfilePath, "utf8");
const cloudbuild = readFileSync(cloudbuildPath, "utf8");
/** The text of the new build file, or an empty string while the file is missing. */
const intakeJobFile = existsSync(intakeJobPath)
  ? readFileSync(intakeJobPath, "utf8")
  : "";

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
 * @param text The text of one build file.
 * @param id The step id.
 * @returns The text of the step, or an empty string when the step is missing.
 */
function readStep(text: string, id: string): string {
  const marker = `id: "${id}"`;
  const start = text.indexOf(marker);
  if (start === -1) return "";
  const next = text.indexOf("\n  - name:", start);
  return next === -1 ? text.slice(start) : text.slice(start, next);
}

/**
 * Reads the shell script of one Cloud Build step, the `- |` block of its args.
 * @param step The text of one step.
 * @returns The script text with the block indent removed, or an empty string.
 */
function readStepScript(step: string): string {
  const lines = step.split("\n");
  const open = lines.findIndex((line) => /^\s*-\s*\|\s*$/u.test(line));
  if (open === -1) return "";
  const body: string[] = [];
  let indent = -1;
  for (const line of lines.slice(open + 1)) {
    if (line.trim() === "") {
      body.push("");
      continue;
    }
    const lead = line.length - line.trimStart().length;
    if (indent === -1) indent = lead;
    if (lead < indent) break;
    body.push(line.slice(indent));
  }
  return body.join("\n");
}

/**
 * Turns a Cloud Build step script into a script that bash can run with fake values.
 * @param script The script text of one step.
 * @param values The value for each substitution key.
 * @returns The script with each `${_KEY}` set, `$PROJECT_ID` set, and `$$` set to `$`.
 */
function renderStepScript(
  script: string,
  values: Record<string, string>,
): string {
  let rendered = script;
  for (const [key, value] of Object.entries(values)) {
    rendered = rendered.split(`\${${key}}`).join(value);
  }
  return rendered.split("$PROJECT_ID").join("fake-project").split("$$").join("$");
}

/**
 * Makes one scratch folder that the row removes afterward.
 * @param prefix The folder name prefix.
 * @returns The path of the new folder.
 */
function makeScratch(prefix: string): string {
  return mkdtempSync(
    existsSync("/tmp/opencode") ? `/tmp/opencode/${prefix}` : join(tmpdir(), prefix),
  );
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
const guardStep = readStep(intakeJobFile, "guard-intake-values");
const jobStep = readStep(intakeJobFile, "deploy-intake-job");
const schedulerStep = readStep(intakeJobFile, "schedule-intake-job");
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
    expect(jobStep).toContain(JOB_IMAGE_FLAG);
    expect(jobStep).not.toContain("$BUILD_ID");
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
    console.log(`job_secrets=${entries.length}`);
  });

  it("puts only plain values in --set-env-vars and no :latest token", () => {
    const envVars = /--set-env-vars=(?<value>[^"\n]+)/u
      .exec(jobStep)
      ?.groups?.value;
    expect(envVars).toBeDefined();
    expect(envVars).not.toContain(":latest");
    const entries = (envVars ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
    const names = entries.map((entry) => entry.split("=")[0] ?? "");
    expect(names.length).toBe(EXPECTED_JOB_ENV_VARS.length);
    expect([...names].sort()).toEqual([...EXPECTED_JOB_ENV_VARS].sort());
    for (const entry of entries) {
      const separator = entry.indexOf("=");
      const name = entry.slice(0, separator);
      const value = entry.slice(separator + 1);
      // No literal value and no empty value sits in the file.
      expect(value, `The value of ${name}`).toBe(`\${_${name}}`);
    }
    console.log(`job_env_vars=${entries.length}`);
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
  }, 120_000);
});

describe("the intake job build file", () => {
  it("keeps the job step and the scheduler step out of the push file", () => {
    const pushJobSteps = countMatches(cloudbuild, /gcloud run jobs/gu);
    const pushSchedulerSteps = countMatches(cloudbuild, /gcloud scheduler/gu);
    console.log(`push_job_steps=${pushJobSteps}`);
    console.log(`push_scheduler_steps=${pushSchedulerSteps}`);
    expect(pushJobSteps).toBe(0);
    expect(pushSchedulerSteps).toBe(0);
    expect(cloudbuild).not.toContain("gcloud run jobs deploy");
    expect(cloudbuild).not.toContain("gcloud scheduler");
    expect(cloudbuild).not.toContain('id: "deploy-intake-job"');
    expect(cloudbuild).not.toContain('id: "schedule-intake-job"');
    expect(countMatches(cloudbuild, /add-iam-policy-binding/gu)).toBe(1);
    expect(cloudbuild).toContain('id: "allow-build-invoker"');
  });

  it("holds exactly the three steps guard-intake-values, deploy-intake-job, and schedule-intake-job in the new file", () => {
    expect(existsSync(intakeJobPath)).toBe(true);
    expect(intakeJobFile).not.toBe("");
    const ids = [
      ...intakeJobFile.matchAll(/^[ \t]+id:[ \t]*"(?<id>[^"]+)"/gmu),
    ].map((match) => match.groups?.id ?? "");
    const stepCount = countMatches(intakeJobFile, /^[ \t]+-[ \t]+name:/gmu);
    console.log(`intake_file_steps=${stepCount}`);
    expect(ids).toEqual([...EXPECTED_INTAKE_STEP_IDS]);
    expect(stepCount).toBe(3);
  });

  it("holds no grant command in the new file", () => {
    expect(intakeJobFile).not.toBe("");
    const grantSteps = EXPECTED_INTAKE_STEP_IDS.filter((id) => {
      const step = readStep(intakeJobFile, id);
      return GRANT_PATTERNS.some((pattern) => pattern.test(step));
    });
    console.log(`intake_file_grant_steps=${grantSteps.length}`);
    expect(grantSteps).toEqual([]);
    for (const pattern of GRANT_PATTERNS) {
      expect(intakeJobFile).not.toMatch(pattern);
    }
  });

  it("holds no substitution default for the six keys in the new file", () => {
    expect(intakeJobFile).not.toBe("");
    expect(SUBSTITUTION_KEYS.length).toBe(6);
    const defaults = SUBSTITUTION_KEYS.filter((key) =>
      new RegExp(`^[ \\t]*${key}[ \\t]*:`, "mu").test(intakeJobFile),
    );
    console.log(`substitution_defaults=${defaults.length}`);
    expect(defaults).toEqual([]);
  });

  it("runs the guard script with fake values and rejects each empty key and a malformed scan cap", () => {
    const script = readStepScript(guardStep);
    expect(guardStep).not.toBe("");
    expect(script).not.toBe("");
    expect(script).toContain("set -euo pipefail");
    expect(SUBSTITUTION_KEYS.length).toBe(6);
    console.log(`guard_empty_cases=${SUBSTITUTION_KEYS.length}`);
    const scratch = makeScratch("intake-guard-");
    try {
      const runGuard = (values: Record<string, string>) =>
        spawnSync("bash", ["-c", renderStepScript(script, values)], {
          cwd: scratch,
          env: {
            PATH: process.env.PATH ?? "",
            HOME: process.env.HOME ?? "",
          } as unknown as NodeJS.ProcessEnv,
          encoding: "utf8",
        });
      const accepted = runGuard(FAKE_VALUES);
      expect(accepted.status, `All six values set: ${accepted.stderr}`).toBe(0);
      for (const key of SUBSTITUTION_KEYS) {
        const rejected = runGuard({ ...FAKE_VALUES, [key]: "" });
        expect(rejected.status, `Empty ${key}`).toBe(1);
        expect(rejected.stderr, `Empty ${key}`).toContain(key.slice(1));
        for (const other of SUBSTITUTION_KEYS) {
          if (other === key) continue;
          expect(
            `${rejected.stdout}${rejected.stderr}`,
            `Empty ${key} must not print the value of ${other}`,
          ).not.toContain(FAKE_VALUES[other]);
        }
      }
      for (const cap of ["abc", "0", "007", "-5"]) {
        const rejected = runGuard({
          ...FAKE_VALUES,
          _ACCOUNTING_DUPLICATE_SCAN_CAP: cap,
        });
        expect(rejected.status, `Scan cap ${cap}`).toBe(1);
        expect(rejected.stderr, `Scan cap ${cap}`).toContain(
          "ACCOUNTING_DUPLICATE_SCAN_CAP",
        );
      }
      const foreignImage = "registry.example.com/other/accounting:fake-tag-9999";
      const rejectedImage = runGuard({
        ...FAKE_VALUES,
        _ACCOUNTING_IMAGE: foreignImage,
      });
      expect(rejectedImage.status, "Foreign image prefix").toBe(1);
      expect(rejectedImage.stderr).toContain("ACCOUNTING_IMAGE");
      expect(`${rejectedImage.stdout}${rejectedImage.stderr}`).not.toContain(
        foreignImage,
      );
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("runs the scheduler script with a stub gcloud for the update branch and the create branch", () => {
    const script = readStepScript(schedulerStep);
    expect(schedulerStep).not.toBe("");
    expect(script).not.toBe("");
    const rendered = renderStepScript(script, FAKE_VALUES);
    const branches = [
      { describeExit: 0, verb: "update" },
      { describeExit: 1, verb: "create" },
    ] as const;
    console.log(`scheduler_branch_cases=${branches.length}`);
    for (const branch of branches) {
      const scratch = makeScratch("intake-scheduler-");
      try {
        const bin = join(scratch, "bin");
        mkdirSync(bin);
        const callLog = join(scratch, "calls.txt");
        const stub = join(bin, "gcloud");
        writeFileSync(
          stub,
          [
            "#!/usr/bin/env bash",
            'printf "%s\\t" "$@" >> "$STUB_CALLS"',
            'printf "\\n" >> "$STUB_CALLS"',
            'if [ "$1" = scheduler ] && [ "$2" = jobs ] && [ "$3" = describe ]; then exit "$STUB_DESCRIBE_EXIT"; fi',
            "exit 0",
            "",
          ].join("\n"),
        );
        chmodSync(stub, 0o755);
        const run = spawnSync("bash", ["-c", rendered], {
          cwd: scratch,
          env: {
            PATH: `${bin}:${process.env.PATH ?? ""}`,
            HOME: process.env.HOME ?? "",
            STUB_CALLS: callLog,
            STUB_DESCRIBE_EXIT: String(branch.describeExit),
          } as unknown as NodeJS.ProcessEnv,
          encoding: "utf8",
        });
        expect(run.status, `describe exit ${branch.describeExit}: ${run.stderr}`).toBe(0);
        const calls = existsSync(callLog)
          ? readFileSync(callLog, "utf8")
              .split("\n")
              .filter((line) => line !== "")
              .map((line) => (line.endsWith("\t") ? line.slice(0, -1) : line).split("\t"))
          : [];
        expect(calls.length, `describe exit ${branch.describeExit}`).toBe(2);
        expect((calls[0] ?? []).slice(0, 4)).toEqual([
          "scheduler",
          "jobs",
          "describe",
          "accounting-intake-poll",
        ]);
        const second = calls[1] ?? [];
        expect(second.slice(0, 5)).toEqual([
          "scheduler",
          "jobs",
          branch.verb,
          "http",
          "accounting-intake-poll",
        ]);
        expect(second).toContain("--location=asia-southeast1");
        expect(second).toContain(
          `--uri=${SCHEDULER_URI.replace("$PROJECT_ID", "fake-project")}`,
        );
        expect(second).toContain("--http-method=POST");
        expect(second).toContain(
          "--oauth-service-account-email=accounting-scheduler@fake-project.iam.gserviceaccount.com",
        );
        expect(second).toContain("--schedule=0 6 * * *");
        expect(second).toContain("--time-zone=Asia/Bangkok");
        expect(second).toContain("--attempt-deadline=1800s");
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    }
  });
});
