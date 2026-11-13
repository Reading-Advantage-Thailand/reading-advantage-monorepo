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
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// Track codecamp_pr_review_recovery_20260820, task F602: the scheduler script must not
// print the Authorization header into the Cloud Build log and must not put the bearer
// token on the gcloud command line. The test runs the real script against a stub gcloud.

const schedulerScript = resolve(
  import.meta.dirname,
  "../../scripts/configure-review-worker-scheduler.sh",
);

const FAKE_TOKEN = "fake-tick-token-0001";
const BRANCHES = ["update", "create"] as const;
type Branch = (typeof BRANCHES)[number];

/**
 * Source of the stub gcloud. It logs every argv, reads stdin and every file path that the
 * script passes, and prints the job resource with the received header values unless the
 * script passes --format=none. This models the real gcloud output.
 */
const STUB_BODY = [
  "const fs = require('node:fs');",
  "const args = process.argv.slice(2);",
  "const log = process.env.FAKE_GCLOUD_LOG;",
  "fs.appendFileSync(log + '.argv', JSON.stringify(args) + '\\n');",
  "let stdinText = '';",
  "try { stdinText = fs.readFileSync(0, 'utf8'); } catch (error) { stdinText = ''; }",
  "const isJobs = args[0] === 'scheduler' && args[1] === 'jobs';",
  "if (isJobs && args[2] === 'describe') {",
  "  if (process.env.FAKE_GCLOUD_DESCRIBE === 'fail') {",
  "    process.stderr.write('ERROR: (gcloud.scheduler.jobs.describe) NOT_FOUND\\n');",
  "    process.exit(1);",
  "  }",
  "  process.stdout.write('httpTarget:\\n  headers:\\n    Authorization: Bearer fake-previous-token-0000\\n');",
  "  process.exit(0);",
  "}",
  "if (!isJobs || (args[2] !== 'create' && args[2] !== 'update')) {",
  "  process.stderr.write('stub gcloud: unexpected command\\n');",
  "  process.exit(2);",
  "}",
  "const files = [];",
  "for (const arg of args) {",
  "  const eq = arg.indexOf('=');",
  "  let candidate = arg.startsWith('--') && eq > -1 ? arg.slice(eq + 1) : arg;",
  "  if (candidate.startsWith('@')) candidate = candidate.slice(1);",
  "  if (candidate.startsWith('/') && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {",
  "    files.push({ path: candidate, content: fs.readFileSync(candidate, 'utf8') });",
  "  }",
  "}",
  "const token = process.env.CODECAMP_REVIEW_WORKER_TICK_TOKEN || '';",
  "const argvHeaders = args.filter((a) => /authorization/i.test(a) || (token && a.includes(token)));",
  "const sources = [];",
  "if (argvHeaders.length > 0) sources.push('argv');",
  "if (token && stdinText.includes(token)) sources.push('stdin');",
  "if (token && files.some((f) => f.content.includes(token))) sources.push('file');",
  "const receivedText = [argvHeaders.join('\\n'), stdinText, ...files.map((f) => f.content)].join('\\n');",
  "fs.appendFileSync(log + '.received', JSON.stringify({ verb: args[2], sources, receivedText }) + '\\n');",
  "const noOutput = args.includes('--format=none') || args.join(' ').includes('--format none');",
  "if (!noOutput) {",
  "  const lines = receivedText.split('\\n').filter((l) => l.trim() !== '');",
  "  process.stdout.write('httpTarget:\\n  headers:\\n' + lines.map((l) => '    ' + l).join('\\n') + '\\n');",
  "}",
  "process.stderr.write('Job [codecamp-review-worker-tick] done.\\n');",
  "process.exit(0);",
].join("\n");

interface Received {
  verb: string;
  sources: string[];
  receivedText: string;
}

interface ScenarioResult {
  status: number | null;
  output: string;
  argvCalls: string[][];
  received: Received[];
}

/** Reads a JSON-lines file and returns the parsed rows, or an empty list when it is missing. */
function readJsonLines<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as T);
}

/**
 * Runs the real scheduler script with a stub gcloud first on PATH, reads the stub logs, and
 * removes the temp folder before it returns.
 * @param branch Which script branch to run: describe succeeds (update) or fails (create).
 * @returns The exit status, the combined output, every gcloud argv, and every header receipt.
 */
function runScenario(branch: Branch): ScenarioResult {
  expect(existsSync(schedulerScript), `missing scheduler script: ${schedulerScript}`).toBe(true);
  const dir = mkdtempSync(join(tmpdir(), "scheduler-script-"));
  try {
    const binDir = join(dir, "bin");
    const log = join(dir, "gcloud");
    mkdirSync(binDir);
    writeFileSync(join(binDir, "gcloud"), `#!${process.execPath}\n${STUB_BODY}\n`);
    chmodSync(join(binDir, "gcloud"), 0o755);

    const result = spawnSync("bash", [schedulerScript], {
      encoding: "utf8",
      input: "",
      timeout: 30_000,
      env: {
        PATH: `${binDir}:${process.env.PATH ?? ""}`,
        HOME: dir,
        PROJECT_ID: "fake-project",
        CODECAMP_REVIEW_WORKER_TICK_TOKEN: FAKE_TOKEN,
        FAKE_GCLOUD_LOG: log,
        FAKE_GCLOUD_DESCRIBE: branch === "update" ? "ok" : "fail",
      },
    });

    return {
      status: result.status,
      output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
      argvCalls: readJsonLines<string[]>(`${log}.argv`),
      received: readJsonLines<Received>(`${log}.received`),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Asserts that the script ran to the end with one describe call and one mutating call. */
function expectRan(branch: Branch, run: ScenarioResult): void {
  expect(run.status, `${branch} branch exit status; output: ${run.output.length} chars`).toBe(0);
  expect(run.argvCalls.length, `${branch} branch gcloud calls`).toBeGreaterThanOrEqual(2);
  expect(run.received.length, `${branch} branch create or update calls`).toBe(1);
}

describe("Codecamp review worker scheduler script (F602)", () => {
  it("prints no bearer token and no Authorization header in the build log output", () => {
    for (const branch of BRANCHES) {
      const run = runScenario(branch);
      expectRan(branch, run);
      expect(run.output, `${branch} branch output holds the token`).not.toContain(FAKE_TOKEN);
      expect(run.output, `${branch} branch output holds an Authorization header`).not.toMatch(
        /authorization/i,
      );
    }
  });

  it("puts the bearer token in no gcloud command-line argument", () => {
    for (const branch of BRANCHES) {
      const run = runScenario(branch);
      expectRan(branch, run);
      const leaking = run.argvCalls.filter((argv) =>
        argv.some((arg) => arg.includes(FAKE_TOKEN)),
      );
      expect(leaking.length, `${branch} branch gcloud calls with the token in argv`).toBe(0);
    }
  });

  it("runs the update branch and the create branch", () => {
    const results = BRANCHES.map((branch) => ({ branch, run: runScenario(branch) }));
    for (const { branch, run } of results) {
      expectRan(branch, run);
      const calls = run.argvCalls.map((argv) => argv.slice(0, 3).join(" "));
      expect(calls[0]).toBe("scheduler jobs describe");
      const mutation = branch === "update" ? "scheduler jobs update" : "scheduler jobs create";
      const other = branch === "update" ? "scheduler jobs create" : "scheduler jobs update";
      expect(calls, `${branch} branch calls`).toContain(mutation);
      expect(calls, `${branch} branch calls`).not.toContain(other);
    }
    const label = `scheduler_script_cases=${results.filter(({ run }) => run.status === 0).length}`;
    const count = Number(/scheduler_script_cases=(\d+)/.exec(label)?.[1] ?? Number.NaN);
    expect(count, label).toBe(BRANCHES.length);
  });

  it("still gives the job the bearer header", () => {
    for (const branch of BRANCHES) {
      const run = runScenario(branch);
      expectRan(branch, run);
      const receipt = run.received[0];
      expect(receipt.verb).toBe(branch === "update" ? "update" : "create");
      expect(
        receipt.receivedText,
        `${branch} branch: the job did not receive the Authorization bearer header`,
      ).toMatch(new RegExp(`Authorization["']?\\s*[=:]\\s*["']?Bearer\\s+${FAKE_TOKEN}`));
    }
  });

  it("passes the bearer header to gcloud through stdin or a file, not through argv", () => {
    for (const branch of BRANCHES) {
      const run = runScenario(branch);
      expectRan(branch, run);
      const sources = run.received[0].sources;
      expect(
        sources.filter((source) => source === "stdin" || source === "file").length,
        `${branch} branch: header sources were ${sources.join(",") || "none"}`,
      ).toBeGreaterThanOrEqual(1);
      expect(sources, `${branch} branch: header sources`).not.toContain("argv");
    }
  });
});
