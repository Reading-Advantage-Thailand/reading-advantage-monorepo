// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const script = resolve(
  import.meta.dirname,
  "capture-marketing-cloud-run-release.sh",
);
const temporaryDirectories: string[] = [];
const candidateDigest = `sha256:${"c".repeat(64)}`;
const previousDigest = `sha256:${"d".repeat(64)}`;
const repository =
  "asia-southeast1-docker.pkg.dev/project/marketing/marketing";

/**
 * Creates a deterministic gcloud executable for release-binding tests.
 * @returns Directory containing the fake gcloud command.
 */
function createFakeGcloud(): string {
  const directory = mkdtempSync(join(tmpdir(), "marketing-release-capture-"));
  temporaryDirectories.push(directory);
  const executable = join(directory, "gcloud");
  writeFileSync(
    executable,
    `#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  *"csv[no-heading](status.traffic.revisionName,status.traffic.percent)"*) printf %s "\${FAKE_CURRENT_TRAFFIC-marketing-00005-old,100}" ;;
  *"status.traffic"*".url)"*) printf %s "https://cdeadbeef---marketing.example.test" ;;
  *"status.traffic"*".revisionName)"*) printf %s "marketing-00006-new" ;;
  *"status.latestCreatedRevisionName)"*) printf %s "\${FAKE_LATEST_REVISION:-marketing-00006-new}" ;;
  *"artifacts docker images describe"*) printf %s "${candidateDigest}" ;;
  *"run revisions describe marketing-00005-old"*) printf %s "${repository}@${previousDigest}" ;;
  *"run revisions describe marketing-00006-new"*) printf %s "${repository}@${candidateDigest}" ;;
  *) echo "unexpected gcloud arguments: $*" >&2; exit 9 ;;
esac
`,
  );
  chmodSync(executable, 0o755);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Marketing Cloud Run release capture", () => {
  it("preserves the exact serving revision and digest for rollback", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "previous");

    execFileSync("bash", [script, "current", outputPrefix], {
      env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
    });

    expect(readFileSync(`${outputPrefix}.revision`, "utf8")).toBe(
      "marketing-00005-old",
    );
    expect(readFileSync(`${outputPrefix}.image`, "utf8")).toBe(
      `${repository}@${previousDigest}`,
    );
  });

  it.each([
    ["blank traffic", ""],
    [
      "multiple traffic rows",
      "marketing-00005-old,50\nmarketing-00004-older,50",
    ],
    [
      "split traffic in one projected row",
      "marketing-00005-old;marketing-00004-older,50;50",
    ],
    ["malformed traffic", "marketing-00005-old,not-a-percent"],
    ["a non-100 percent", "marketing-00005-old,99"],
  ])("fails closed for %s", (_caseName, traffic) => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "previous");

    expect(() =>
      execFileSync("bash", [script, "current", outputPrefix], {
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          FAKE_CURRENT_TRAFFIC: traffic,
        },
        stdio: "pipe",
      }),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.revision`, "utf8")).toThrow();
    expect(() => readFileSync(`${outputPrefix}.image`, "utf8")).toThrow();
  });

  it("binds a collision-safe tag to the latest release image", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    execFileSync(
      "bash",
      [
        script,
        "candidate",
        "cdeadbeef",
        `${repository}:build-id`,
        outputPrefix,
      ],
      { env: { ...process.env, PATH: `${directory}:${process.env.PATH}` } },
    );

    expect(readFileSync(`${outputPrefix}.url`, "utf8")).toBe(
      "https://cdeadbeef---marketing.example.test",
    );
    expect(readFileSync(`${outputPrefix}.revision`, "utf8")).toBe(
      "marketing-00006-new",
    );
    expect(readFileSync(`${outputPrefix}.image`, "utf8")).toBe(
      `${repository}@${candidateDigest}`,
    );
  });

  it.each([
    "candidate-build-id",
    "cDEADBEEF",
    "cdeadbee",
    "cdeadbeef0",
  ])("rejects invalid candidate tag %s", (tag) => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    expect(() =>
      execFileSync(
        "bash",
        [script, "candidate", tag, `${repository}:build-id`, outputPrefix],
        {
          env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
          stdio: "pipe",
        },
      ),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.url`, "utf8")).toThrow();
  });

  it("fails closed when another revision wins the candidate tag race", () => {
    const directory = createFakeGcloud();
    const outputPrefix = join(directory, "candidate");

    expect(() =>
      execFileSync(
        "bash",
        [
          script,
          "candidate",
          "cdeadbeef",
          `${repository}:build-id`,
          outputPrefix,
        ],
        {
          env: {
            ...process.env,
            PATH: `${directory}:${process.env.PATH}`,
            FAKE_LATEST_REVISION: "marketing-00007-other",
          },
          stdio: "pipe",
        },
      ),
    ).toThrow();
    expect(() => readFileSync(`${outputPrefix}.url`, "utf8")).toThrow();
  });
});
